import { createFileRoute } from '@tanstack/react-router';

import { PageError } from '@/components/errors/page-error';

import PageSignUp from '@/features/auth/page-sign-up';

export const Route = createFileRoute('/sign-up/')({
  component: RouteComponent,
  errorComponent: () => <PageError type="error-boundary" />,
});

function RouteComponent() {
  return <PageSignUp />;
}
