import { describe, expect, it, vi } from 'vitest';

import { render, setupUser } from '@/tests/utils';

import { ModuleSummaryCards } from './module-summary-cards';
import type { Module } from '../schema';

const mockModules: Module[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'treasury',
    display_name: 'Treasury',
    is_active: true,
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174002',
    name: 'compliance',
    display_name: 'Compliance',
    is_active: true,
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174003',
    name: 'tokenisation',
    display_name: 'Tokenisation',
    is_active: true,
  },
];

describe('ModuleSummaryCards', () => {
  it('should render all modules with correct display names', async () => {
    const { getByText } = render(
      <ModuleSummaryCards
        modules={mockModules}
        userCounts={{}}
        roleCounts={{}}
        selectedModule={null}
        onSelectModule={() => {}}
      />
    );

    await expect.element(getByText('Treasury')).toBeVisible();
    await expect.element(getByText('Compliance')).toBeVisible();
    await expect.element(getByText('Tokenisation')).toBeVisible();
  });

  it('should render correct user and role counts', async () => {
    const userCounts = {
      '123e4567-e89b-12d3-a456-426614174001': 12,
      '123e4567-e89b-12d3-a456-426614174002': 5,
      '123e4567-e89b-12d3-a456-426614174003': 0,
    };

    const roleCounts = {
      '123e4567-e89b-12d3-a456-426614174001': 4,
      '123e4567-e89b-12d3-a456-426614174002': 3,
      '123e4567-e89b-12d3-a456-426614174003': 2,
    };

    const { getByText } = render(
      <ModuleSummaryCards
        modules={mockModules}
        userCounts={userCounts}
        roleCounts={roleCounts}
        selectedModule={null}
        onSelectModule={() => {}}
      />
    );

    await expect.element(getByText('12 users')).toBeVisible();
    await expect.element(getByText('4 roles')).toBeVisible();
    await expect.element(getByText('5 users')).toBeVisible();
    await expect.element(getByText('3 roles')).toBeVisible();
    await expect.element(getByText('0 users')).toBeVisible();
    await expect.element(getByText('2 roles')).toBeVisible();
  });

  it('should show 0 counts when not provided', async () => {
    const { getByText } = render(
      <ModuleSummaryCards
        modules={[mockModules[0]!]}
        userCounts={{}}
        roleCounts={{}}
        selectedModule={null}
        onSelectModule={() => {}}
      />
    );

    await expect.element(getByText('0 users')).toBeVisible();
    await expect.element(getByText('0 roles')).toBeVisible();
  });

  it('should call onSelectModule with module id when clicked', async () => {
    const user = setupUser();
    const onSelectModule = vi.fn();

    const { getByText } = render(
      <ModuleSummaryCards
        modules={mockModules}
        userCounts={{}}
        roleCounts={{}}
        selectedModule={null}
        onSelectModule={onSelectModule}
      />
    );

    await user.click(getByText('Treasury'));

    expect(onSelectModule).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174001'
    );
  });

  it('should call onSelectModule with null when selected module is clicked', async () => {
    const user = setupUser();
    const onSelectModule = vi.fn();
    const selectedModuleId = '123e4567-e89b-12d3-a456-426614174001';

    const { getByText } = render(
      <ModuleSummaryCards
        modules={mockModules}
        userCounts={{}}
        roleCounts={{}}
        selectedModule={selectedModuleId}
        onSelectModule={onSelectModule}
      />
    );

    await user.click(getByText('Treasury'));

    expect(onSelectModule).toHaveBeenCalledWith(null);
  });

  it('should render empty when no modules provided', () => {
    const { container } = render(
      <ModuleSummaryCards
        modules={[]}
        userCounts={{}}
        roleCounts={{}}
        selectedModule={null}
        onSelectModule={() => {}}
      />
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });
});
