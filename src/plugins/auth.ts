import { AuthorizationError, PaymentRequiredError } from '@iofinnet/errors-sdk';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { z } from 'zod';
import { logger } from '@/utils/powertools.js';

const AuthPayloadSchema = z.object({
  sub: z.string(),
  organisationId: z.string(),
  scope: z.string(),
  username: z.string(),
  client_id: z.string(),
});

export interface AuthContext {
  organisationId: string;
  userId: string;
  token: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

export interface AuthPluginOptions {
  /** Routes that don't require authentication */
  publicRoutes?: string[];
  /** JWKS endpoint URL for JWT signature verification (e.g., https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json) */
  jwksUrl?: string;
  /** List of allowed OAuth client IDs */
  allowedClientIds?: string[];
}

const VAULT_ENTITLEMENT_NAME = 'chains-public';

function isPublicRoute(url: string, publicRoutes: string[]): boolean {
  const path = url.split('?')[0] ?? '';
  return publicRoutes.some((route) => {
    if (route.endsWith('*')) {
      return path.startsWith(route.slice(0, -1));
    }
    return path === route;
  });
}

async function authPlugin(fastify: FastifyInstance, options: AuthPluginOptions = {}) {
  const publicRoutes = options.publicRoutes ?? ['/health', '/v2/chains'];
  const { jwksUrl, allowedClientIds } = options;

  // Create JWKS key set for JWT verification (cached automatically by jose)
  const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;
  if (jwks) {
    logger.info('JWT verification enabled with JWKS', { jwksUrl });
  }

  fastify.decorateRequest('auth', null);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    // Skip auth for public routes
    if (isPublicRoute(request.url, publicRoutes)) {
      return;
    }

    // Mode 1: Lambda with API Gateway authorizer
    const lambdaEvent = (request as any).awsLambda?.event;
    if (lambdaEvent?.requestContext?.authorizer?.lambda) {
      const { organisationId, userSub, scope } = lambdaEvent.requestContext.authorizer.lambda;

      if (!scope?.includes(VAULT_ENTITLEMENT_NAME)) {
        throw new PaymentRequiredError('not entitled');
      }

      request.auth = { organisationId, userId: userSub, token: lambdaEvent.requestContext.authorizer.lambda.base64Token };
      return;
    }

    // Mode 2: JWT Bearer token (container mode with full JWKS validation)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7); // Remove 'Bearer ' prefix

      if (!jwks) {
        logger.warn('JWT received but JWKS not configured - rejecting request');
        throw new AuthorizationError('JWT verification not configured');
      }

      try {
        // Verify JWT signature using JWKS
        const { payload } = await jwtVerify(token, jwks, {
          // Optional: Add issuer/audience validation if needed
          // issuer: 'https://cognito-idp.{region}.amazonaws.com/{userPoolId}',
          // audience: 'your-audience',
        });

        // Validate payload structure
        const validatedPayload = AuthPayloadSchema.parse(payload);

        // Validate client_id against allowed list
        if (allowedClientIds && allowedClientIds.length > 0) {
          if (!allowedClientIds.includes(validatedPayload.client_id)) {
            logger.warn('JWT client_id not in allowed list', {
              clientId: validatedPayload.client_id,
              allowedClientIds,
            });
            throw new AuthorizationError('Invalid client');
          }
        }

        // Check entitlements
        if (!validatedPayload.scope?.includes(VAULT_ENTITLEMENT_NAME)) {
          throw new PaymentRequiredError('not entitled');
        }

        request.auth = {
          organisationId: validatedPayload.organisationId,
          userId: validatedPayload.sub,
          token: token,
        };
        return;
      } catch (error) {
        if (error instanceof AuthorizationError || error instanceof PaymentRequiredError) {
          throw error;
        }
        logger.error('JWT verification failed', { error });
        throw new AuthorizationError('Invalid token');
      }
    }

    throw new AuthorizationError('Authentication required');
  });
}

export default fp(authPlugin, { name: 'auth' });
