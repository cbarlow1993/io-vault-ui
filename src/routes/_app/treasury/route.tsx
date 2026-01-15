import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/treasury')({
  component: TreasuryLayout,
});

function TreasuryLayout() {
  return <Outlet />;
}
