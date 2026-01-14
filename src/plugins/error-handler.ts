import {
  AuthorizationError,
  BadGatewayError,
  DuplicateError,
  InternalServerError,
  isIoError,
  NotFoundError,
  NotImplementedError,
  OperationForbiddenError,
  OperationNotAllowedError,
  PaymentRequiredError,
  PreconditionRequiredError,
  ServiceUnavailableError,
  UnprocessableContentError,
  UserInputError,
} from '@iofinnet/errors-sdk';
import type { FastifyError, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

function getStatusCodeForIoError(error: Error): number {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof AuthorizationError) return 401;
  if (error instanceof PaymentRequiredError) return 402;
  if (error instanceof OperationForbiddenError) return 403;
  if (error instanceof OperationNotAllowedError) return 405;
  if (error instanceof DuplicateError) return 409;
  if (error instanceof UserInputError) return 400;
  if (error instanceof UnprocessableContentError) return 422;
  if (error instanceof PreconditionRequiredError) return 428;
  if (error instanceof InternalServerError) return 500;
  if (error instanceof NotImplementedError) return 501;
  if (error instanceof BadGatewayError) return 502;
  if (error instanceof ServiceUnavailableError) return 503;
  return 500;
}

async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, request, reply) => {
    const logger = request.log;

    // Zod validation errors
    if (error instanceof ZodError) {
      logger.warn({ error: error.issues }, 'Validation error');
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Validation failed',
        details: error.issues,
      });
    }

    // @iofinnet/errors-sdk errors
    if (isIoError(error)) {
      const ioError = error as unknown as Error;
      const statusCode = getStatusCodeForIoError(ioError);
      logger.warn({ error: ioError }, `HTTP error: ${statusCode}`);
      return reply.status(statusCode).send({
        error: ioError.name,
        message: ioError.message,
      });
    }

    // Fastify validation errors
    const fastifyError = error as FastifyError;
    if (fastifyError.validation) {
      logger.warn({ err: fastifyError }, 'Fastify validation error');
      return reply.status(400).send({
        error: 'Bad Request',
        message: fastifyError.message,
      });
    }

    // Response serialization errors (from fastify-type-provider-zod)
    if (fastifyError.code === 'FST_ERR_RESPONSE_SERIALIZATION') {
      logger.error(
        { error: fastifyError, cause: fastifyError.cause },
        'Response serialization failed - response does not match schema'
      );
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Response serialization failed',
        // Include details in non-production for debugging
        ...(process.env.NODE_ENV !== 'production' && {
          details: fastifyError.cause,
        }),
      });
    }

    // Unexpected errors
    logger.error({ error: error, stack: (error as Error).stack }, 'Unhandled error');
    const isProd = process.env.STAGE === 'prod' || process.env.NODE_ENV === 'production';
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: isProd ? 'An unexpected error occurred' : (error as Error).message,
      ...(isProd ? {} : {
        stack: (error as Error).stack,
        name: (error as Error).name,
      }),
    });
  });
}

export default fp(errorHandlerPlugin, { name: 'error-handler' });
