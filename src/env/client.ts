/* eslint-disable no-process-env */
import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const envMetaOrProcess: Record<string, string> = import.meta.env ?? process.env;

const isDev = process.env.NODE_ENV
  ? process.env.NODE_ENV === 'development'
  : import.meta.env?.DEV;

const getBaseUrl = () => {
  const vercelUrlPreviewUrl =
    envMetaOrProcess.VITE_VERCEL_ENV === 'preview'
      ? envMetaOrProcess.VITE_VERCEL_BRANCH_URL
      : null;

  if (vercelUrlPreviewUrl) {
    return `https://${vercelUrlPreviewUrl}`;
  }

  return envMetaOrProcess.VITE_BASE_URL;
};

export const envClient = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_BASE_URL: z.url(),
    VITE_IS_DEMO: z
      .enum(['true', 'false'])
      .optional()
      .prefault('false')
      .transform((v) => v === 'true'),

    // Auth mode: 'clerk' for SaaS, 'better-auth' for on-prem
    VITE_AUTH_MODE: z
      .enum(['clerk', 'better-auth'])
      .optional()
      .prefault('better-auth'),

    // Clerk publishable key (only required when VITE_AUTH_MODE='clerk')
    VITE_CLERK_PUBLISHABLE_KEY: z.string().optional(),

    VITE_ENV_NAME: z
      .string()
      .optional()
      .transform((value) => value ?? (isDev ? 'LOCAL' : undefined)),
    VITE_ENV_EMOJI: z
      .emoji()
      .optional()
      .transform((value) => value ?? (isDev ? '🚧' : undefined)),
    VITE_ENV_COLOR: z
      .string()
      .optional()
      .transform((value) => value ?? (isDev ? 'gold' : 'plum')),

    // Chargebee billing (optional - feature flagged)
    VITE_ENABLE_CHARGEBEE_BILLING: z
      .enum(['true', 'false'])
      .optional()
      .prefault('false')
      .transform((v) => v === 'true'),
    VITE_CHARGEBEE_SITE: z.string().optional(),
    VITE_CHARGEBEE_PUBLISHABLE_KEY: z.string().optional(),
  },
  runtimeEnv: {
    ...envMetaOrProcess,
    VITE_BASE_URL: getBaseUrl(),
  },
  emptyStringAsUndefined: true,
  skipValidation: !!envMetaOrProcess.SKIP_ENV_VALIDATION,
});
