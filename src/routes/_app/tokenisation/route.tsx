import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/tokenisation')({
  component: TokenisationLayout,
});

function TokenisationLayout() {
  return <Outlet />;
}
