import { describe, it, expect } from 'vitest';

import { page, render } from '@/tests/utils';

import { getDeviceIcon, type DeviceType } from './device-helpers';

describe('device helpers', () => {
  describe('getDeviceIcon', () => {
    it.each<DeviceType>(['ios', 'android', 'virtual'])(
      'should render icon for %s',
      async (type) => {
        render(<>{getDeviceIcon(type)}</>);
        const svg = page.getByRole('img', { includeHidden: true }).first();
        // SVG icons may not have role="img", so query by tag
        await expect.poll(() => document.querySelector('svg')).toBeTruthy();
      }
    );

    it('should apply custom className', async () => {
      render(
        <>{getDeviceIcon('virtual', { className: 'text-neutral-500' })}</>
      );
      await expect
        .poll(() => {
          const svg = document.querySelector('svg');
          return svg?.classList.contains('text-neutral-500');
        })
        .toBe(true);
    });
  });
});
