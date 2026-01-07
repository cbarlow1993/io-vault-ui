export class ConcurrentModificationError extends Error {
  constructor(workflowId: string) {
    super(`Workflow ${workflowId} was modified by another request`);
    this.name = 'ConcurrentModificationError';
  }
}

export class InvalidStateTransitionError extends Error {
  constructor(workflowId: string, currentState: string, event: string) {
    super(
      `Cannot send '${event}' to workflow ${workflowId} in state '${currentState}'`
    );
    this.name = 'InvalidStateTransitionError';
  }
}

export class WorkflowNotFoundError extends Error {
  constructor(workflowId: string) {
    super(`Workflow ${workflowId} not found`);
    this.name = 'WorkflowNotFoundError';
  }
}
