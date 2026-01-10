import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_app/policies/whitelists/$whitelistId/versions/$versionNumber'
)({
  component: () => <Outlet />,
});
