import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/compliance/identities')({
  component: () => <Outlet />,
});
