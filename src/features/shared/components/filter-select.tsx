import { CheckIcon, ChevronDownIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// =============================================================================
// Types
// =============================================================================

export type FilterSelectOption = {
  id: string;
  label: string;
};

type FilterSelectProps<T extends FilterSelectOption> = {
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
  placeholder?: string;
  align?: 'start' | 'center' | 'end';
  minWidth?: string;
};

// =============================================================================
// Component
// =============================================================================

/**
 * A generic filter select dropdown component.
 *
 * @example
 * ```tsx
 * const STATUS_OPTIONS = [
 *   { id: 'all', label: 'All Status' },
 *   { id: 'active', label: 'Active' },
 *   { id: 'pending', label: 'Pending' },
 * ] as const;
 *
 * const [status, setStatus] = useState(STATUS_OPTIONS[0]);
 *
 * <FilterSelect
 *   options={STATUS_OPTIONS}
 *   value={status}
 *   onChange={setStatus}
 * />
 * ```
 */
export const FilterSelect = <T extends FilterSelectOption>({
  options,
  value,
  onChange,
  className,
  placeholder = 'Select...',
  align = 'start',
  minWidth = '120px',
}: FilterSelectProps<T>) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'hover-medium flex h-7 items-center justify-between gap-2 border-input px-2 text-xs text-neutral-900 focus:border-neutral-400 focus:outline-none',
            className
          )}
        >
          <span className="truncate">{value?.label ?? placeholder}</span>
          <ChevronDownIcon className="size-3 shrink-0 text-neutral-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="rounded-none p-0"
        style={{ minWidth }}
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => onChange(option)}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-none px-2 py-1.5 text-xs"
          >
            <span>{option.label}</span>
            {value?.id === option.id && (
              <CheckIcon className="size-3 text-neutral-900" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
