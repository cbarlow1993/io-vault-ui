import type { ReactNode } from 'react';

import { cn } from '@/lib/tailwind/utils';

export const PageLayout = (props: {
  children?: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'font-inter flex flex-1 flex-col bg-neutral-50',
        props.className
      )}
    >
      {props.children}
    </div>
  );
};

export const PageLayoutTopBar = (props: {
  children?: ReactNode;
  endActions?: ReactNode;
  className?: string;
}) => {
  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5',
        props.className
      )}
    >
      <div className="flex items-center gap-4">{props.children}</div>
      {props.endActions && (
        <div className="flex items-center gap-3">{props.endActions}</div>
      )}
    </header>
  );
};

export const PageLayoutTopBarTitle = (props: {
  children?: ReactNode;
  className?: string;
}) => {
  return (
    <h1
      className={cn(
        'text-sm font-semibold tracking-tight text-neutral-900',
        props.className
      )}
    >
      {props.children}
    </h1>
  );
};

export const PageLayoutContent = (props: {
  children?: ReactNode;
  className?: string;
  containerClassName?: string;
}) => {
  return (
    <div className={cn('flex-1 overflow-auto', props.className)}>
      <div
        className={cn('mx-auto max-w-[1400px] px-5', props.containerClassName)}
      >
        {props.children}
      </div>
    </div>
  );
};

export const PageLayoutContainer = (props: {
  children?: ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn('mx-auto max-w-[1400px] px-5', props.className)}>
      {props.children}
    </div>
  );
};
