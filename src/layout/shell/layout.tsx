import { type ReactNode } from 'react';

import { NavSidebar } from '@/layout/shell/nav-sidebar';

export const Layout = (props: { children?: ReactNode }) => {
  return (
    <div className="flex flex-1 flex-col" data-testid="layout-shell">
      <NavSidebar>{props.children}</NavSidebar>
    </div>
  );
};
