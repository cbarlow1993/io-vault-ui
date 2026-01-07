import { createActor } from 'xstate';
import { transactionMachine } from '@/src/services/workflow/machine.js';
import type {
  CreateWorkflowInput,
  Workflow,
  WorkflowContext,
  WorkflowEvent,
  WorkflowEventRecord,
  WorkflowState,
} from '@/src/services/workflow/types.js';
import {
  InvalidStateTransitionError,
  WorkflowNotFoundError,
} from '@/src/services/workflow/errors.js';
import type { WorkflowRepository } from '@/src/repositories/workflow.repository.js';
import type { WorkflowEventsRepository } from '@/src/repositories/workflow-events.repository.js';

interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

export class WorkflowOrchestrator {
  constructor(
    private workflowRepo: WorkflowRepository,
    private eventsRepo: WorkflowEventsRepository,
    private logger: Logger
  ) {}

  /**
   * Creates a new workflow with the given input
   */
  async create(input: CreateWorkflowInput): Promise<Workflow> {
    return this.workflowRepo.create(input);
  }

  /**
   * Sends an event to a workflow, transitioning its state
   */
  async send(
    workflowId: string,
    event: WorkflowEvent,
    triggeredBy: string
  ): Promise<Workflow> {
    // Fetch workflow with pessimistic lock
    const workflow = await this.workflowRepo.findByIdForUpdate(workflowId);

    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }

    const fromState = workflow.state;

    // Use XState actor to compute the next state
    // When rehydrating from a snapshot, we provide an empty input since context comes from snapshot
    const actor = createActor(transactionMachine, {
      input: {},
      snapshot: transactionMachine.resolveState({
        value: fromState,
        context: workflow.context,
      }),
    });

    actor.start();

    let toState: WorkflowState;
    let newContext: WorkflowContext;

    try {
      // Check if the event can be sent from the current state
      const currentSnapshot = actor.getSnapshot();
      const canTransition = currentSnapshot.can(event);

      if (!canTransition) {
        throw new InvalidStateTransitionError(workflowId, fromState, event.type);
      }

      // Send the event and get the new state
      actor.send(event);
      const newSnapshot = actor.getSnapshot();

      toState = newSnapshot.value as WorkflowState;
      newContext = newSnapshot.context;
    } finally {
      actor.stop();
    }

    // Update the workflow in the database
    const updatedWorkflow = await this.workflowRepo.update(
      workflowId,
      workflow.version,
      {
        state: toState,
        context: newContext,
      }
    );

    // Extract event payload (everything except 'type')
    const { type: eventType, ...eventPayload } = event;

    // Record the event
    await this.eventsRepo.create({
      workflowId,
      eventType,
      eventPayload,
      fromState,
      toState,
      contextSnapshot: newContext as unknown as Record<string, unknown>,
      triggeredBy,
    });

    // Log the transition
    this.logger.info('Workflow state transition', {
      workflowId,
      eventType,
      fromState,
      toState,
      triggeredBy,
    });

    return updatedWorkflow;
  }

  /**
   * Retrieves a workflow by its ID
   */
  async getById(workflowId: string): Promise<Workflow | null> {
    return this.workflowRepo.findById(workflowId);
  }

  /**
   * Retrieves the event history for a workflow
   */
  async getHistory(workflowId: string): Promise<WorkflowEventRecord[]> {
    return this.eventsRepo.findByWorkflowId(workflowId);
  }
}
