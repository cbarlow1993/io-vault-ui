import * as React from 'react';

import { cn } from '@/lib/tailwind/utils';

// =============================================================================
// Tabs Context
// =============================================================================

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

// =============================================================================
// Tabs Root
// =============================================================================

type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
};

function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div data-slot="tabs" className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// =============================================================================
// Tabs List
// =============================================================================

type TabsListProps = {
  children: React.ReactNode;
  className?: string;
};

function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      className={cn('flex border-b border-neutral-200', className)}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Tabs Trigger
// =============================================================================

type TabsTriggerProps = {
  value: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
};

function TabsTrigger({
  value,
  children,
  icon,
  badge,
  className,
}: TabsTriggerProps) {
  const { value: activeValue, onValueChange } = useTabsContext();
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={() => onValueChange(value)}
      className={cn(
        'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors',
        isActive
          ? 'border-brand-500 text-brand-600'
          : 'border-transparent text-neutral-500 hover:text-neutral-700',
        className
      )}
    >
      {icon}
      {children}
      {badge !== undefined && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
            isActive
              ? 'bg-brand-100 text-brand-700'
              : 'bg-neutral-100 text-neutral-600'
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// =============================================================================
// Tabs Content
// =============================================================================

type TabsContentProps = {
  value: string;
  children: React.ReactNode;
  className?: string;
};

function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: activeValue } = useTabsContext();

  if (activeValue !== value) {
    return null;
  }

  return (
    <div
      data-slot="tabs-content"
      role="tabpanel"
      data-state="active"
      className={className}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
