import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_app/vaults/$vaultId/chain/$chain/addresses/$address'
)({
  component: () => <Outlet />,
});
