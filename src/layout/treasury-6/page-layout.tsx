import type { ReactNode } from 'react';

import { cn } from '@/lib/tailwind/utils';

export const PageLayout = (props: {
  children?: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col bg-neutral-50 font-inter',
        props.className
      )}
    >
      {props.children}
    </div>
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
