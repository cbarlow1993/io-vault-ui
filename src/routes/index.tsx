import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: RouteComponent,
  beforeLoad: () => {
    // Redirect to overview - auth guard will handle unauthenticated users
    throw redirect({ to: '/overview' });
  },
});

function RouteComponent() {
  return null;
}
