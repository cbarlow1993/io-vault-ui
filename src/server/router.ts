import { InferRouterInputs, InferRouterOutputs } from '@orpc/server';

import accountRouter from './routers/account';
import billingRouter from './routers/billing';
import configRouter from './routers/config';
import signersRouter from './routers/signers';

// TODO: User router removed - was dependent on Prisma
// Re-implement when vault API is integrated for user management

export type Router = typeof router;
export type Inputs = InferRouterInputs<typeof router>;
export type Outputs = InferRouterOutputs<typeof router>;
export const router = {
  account: accountRouter,
  billing: billingRouter,
  config: configRouter,
  signers: signersRouter,
};
