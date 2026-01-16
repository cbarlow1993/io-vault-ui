import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/global/module-access')({
  component: PageSettingsModuleAccessPlaceholder,
});

function PageSettingsModuleAccessPlaceholder() {
  return (
    <div className="p-8">
      <h1 className="text-lg font-semibold">Module Access</h1>
      <p className="text-neutral-500">Coming soon...</p>
    </div>
  );
}
