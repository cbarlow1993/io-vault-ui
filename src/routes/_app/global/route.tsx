import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/global')({
  component: GlobalLayout,
});

function GlobalLayout() {
  return <Outlet />;
}
