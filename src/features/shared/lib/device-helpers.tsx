/**
 * Device type helpers for signers and vault displays.
 *
 * Provides consistent device icons and labels across the application.
 */

import { ServerIcon, SmartphoneIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { type DeviceType, getDeviceLabel } from './status-styles';

export type { DeviceType };
export { getDeviceLabel };

/**
 * Get the appropriate icon for a device type.
 *
 * @param deviceType - The type of device (ios, android, virtual)
 * @param options - Optional className for custom styling
 * @returns React node with the appropriate icon
 *
 * @example
 * ```tsx
 * <>{getDeviceIcon('virtual')}</>
 * <>{getDeviceIcon('ios', { className: 'size-5 text-neutral-500' })}</>
 * ```
 */
export const getDeviceIcon = (
  deviceType: DeviceType,
  options?: { className?: string }
): ReactNode => {
  const className = cn('size-4', options?.className);

  switch (deviceType) {
    case 'virtual':
      return <ServerIcon className={className} />;
    case 'ios':
    case 'android':
      return <SmartphoneIcon className={className} />;
  }
};
