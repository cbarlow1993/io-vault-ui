import { ORPCError, os } from '@orpc/server';
import { type ResponseHeadersPluginContext } from '@orpc/server/plugins';
import { getRequest } from '@tanstack/react-start/server';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { getAuthProvider } from '@/lib/auth';

import { envClient } from '@/env/client';
import { logger } from '@/server/logger';

// TODO: Permission type will be re-added when vault API is integrated
// import { Permission } from '@/lib/auth/permissions';

const base = os
  .$context<ResponseHeadersPluginContext>()
  // Auth
  .use(async ({ next, context }) => {
    const start = performance.now();

    // Use the Clerk auth provider
    const authProvider = getAuthProvider();

    // Get the full request object from TanStack Start
    const request = getRequest();
    const sessionData = await authProvider.getSession(request);

    const duration = performance.now() - start;

    context.resHeaders?.append(
      'Server-Timing',
      `auth;dur=${duration.toFixed(2)}`
    );

    return await next({
      context: {
        user: sessionData?.user,
        session: sessionData?.session,
      },
    });
  })

  // Logger
  .use(async ({ next, context, procedure, path }) => {
    const start = performance.now();
    const meta = {
      path: path.join('.'),
      type: procedure['~orpc'].route.method,
      requestId: randomUUID(),
      userId: context.user?.id,
    };

    const loggerForMiddleWare = logger.child({ ...meta, scope: 'procedure' });

    loggerForMiddleWare.info('Before');

    try {
      const result = await next({
        context: { logger: loggerForMiddleWare },
      });

      const duration = performance.now() - start;
      loggerForMiddleWare.info({ durationMs: duration }, 'After');
      context.resHeaders?.append(
        'Server-Timing',
        `global;dur=${duration.toFixed(2)}`
      );

      return result;
    } catch (error) {
      const logLevel = (() => {
        if (!(error instanceof ORPCError)) return 'error';
        if (error.message === 'DEMO_MODE_ENABLED') return 'info';
        const errorCode = error.status;
        if (errorCode >= 500) return 'error';
        if (errorCode >= 400) return 'warn';
        if (errorCode >= 300) return 'info';
        return 'error';
      })();

      loggerForMiddleWare[logLevel](error);
      throw error;
    }
  })
  // Demo Mode
  .use(async ({ next, procedure }) => {
    if (envClient.VITE_IS_DEMO && procedure['~orpc'].route.method !== 'GET') {
      throw new ORPCError('METHOD_NOT_SUPPORTED', {
        message: 'DEMO_MODE_ENABLED',
      });
    }
    return await next();
  });

export const publicProcedure = () => base;

// TODO: Re-implement permission checking when vault API is integrated
// For now, protected procedures only check for authentication
export const protectedProcedure = ({
  permission: _permission,
}: {
  permission: unknown | null;
}) =>
  base.use(async ({ context, next }) => {
    const { user, session } = context;

    if (!user || !session) {
      throw new ORPCError('UNAUTHORIZED');
    }

    // TODO: Re-implement permission checking with vault API
    // Permission checking is disabled until we integrate with the vault API

    return await next({
      context: {
        user,
        session,
      },
    });
  });
