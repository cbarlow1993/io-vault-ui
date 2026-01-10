import { type ReactNode } from 'react';

import { NavSidebar } from '@/layout/treasury-6/nav-sidebar';

export const Layout = (props: { children?: ReactNode }) => {
  return (
    <div className="flex flex-1 flex-col" data-testid="layout-treasury-6">
      <NavSidebar>{props.children}</NavSidebar>
    </div>
  );
};
