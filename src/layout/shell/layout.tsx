import { type ReactNode } from 'react';

import { useModule } from '@/lib/modules';

import { NavSidebar } from '@/layout/shell/nav-sidebar';

export const Layout = (props: { children?: ReactNode }) => {
  const { currentModule } = useModule();

  return (
    <div
      className="flex flex-1 flex-col"
      data-testid="layout-shell"
      data-module={currentModule}
    >
      <NavSidebar>{props.children}</NavSidebar>
    </div>
  );
};
