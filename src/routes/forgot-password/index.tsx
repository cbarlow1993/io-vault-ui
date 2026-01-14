import { createFileRoute } from '@tanstack/react-router';

import { PageError } from '@/components/errors/page-error';

import PageForgotPassword from '@/features/auth/page-forgot-password';

export const Route = createFileRoute('/forgot-password/')({
  component: RouteComponent,
  errorComponent: () => <PageError type="error-boundary" />,
});

function RouteComponent() {
  return <PageForgotPassword />;
}
