import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_app/treasury/policies/whitelists/$whitelistId/versions/$versionNumber'
)({
  component: () => <Outlet />,
});
