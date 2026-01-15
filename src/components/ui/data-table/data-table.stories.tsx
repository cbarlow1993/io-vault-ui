import type { Meta } from '@storybook/react-vite';
import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';

import { FilterSelect } from '@/features/shared/components/filter-select';

import { DataTable } from './data-table';
import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableToolbar } from './data-table-toolbar';

export default {
  title: 'DataTable',
} satisfies Meta<typeof DataTable>;

// Sample data type
type User = {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'pending' | 'inactive';
  role: string;
  createdAt: string;
};

// Sample data
const sampleUsers: User[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    status: 'active',
    role: 'Admin',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    status: 'active',
    role: 'User',
    createdAt: '2024-01-20',
  },
  {
    id: '3',
    name: 'Carol Williams',
    email: 'carol@example.com',
    status: 'pending',
    role: 'User',
    createdAt: '2024-02-01',
  },
  {
    id: '4',
    name: 'David Brown',
    email: 'david@example.com',
    status: 'inactive',
    role: 'User',
    createdAt: '2024-02-10',
  },
  {
    id: '5',
    name: 'Eva Martinez',
    email: 'eva@example.com',
    status: 'active',
    role: 'Admin',
    createdAt: '2024-02-15',
  },
  {
    id: '6',
    name: 'Frank Wilson',
    email: 'frank@example.com',
    status: 'active',
    role: 'User',
    createdAt: '2024-02-20',
  },
  {
    id: '7',
    name: 'Grace Lee',
    email: 'grace@example.com',
    status: 'pending',
    role: 'User',
    createdAt: '2024-03-01',
  },
  {
    id: '8',
    name: 'Henry Taylor',
    email: 'henry@example.com',
    status: 'active',
    role: 'User',
    createdAt: '2024-03-05',
  },
  {
    id: '9',
    name: 'Ivy Chen',
    email: 'ivy@example.com',
    status: 'inactive',
    role: 'User',
    createdAt: '2024-03-10',
  },
  {
    id: '10',
    name: 'Jack Davis',
    email: 'jack@example.com',
    status: 'active',
    role: 'Admin',
    createdAt: '2024-03-15',
  },
  {
    id: '11',
    name: 'Kate Miller',
    email: 'kate@example.com',
    status: 'active',
    role: 'User',
    createdAt: '2024-03-20',
  },
  {
    id: '12',
    name: 'Leo Garcia',
    email: 'leo@example.com',
    status: 'pending',
    role: 'User',
    createdAt: '2024-03-25',
  },
];

// Column definitions
const columns: ColumnDef<User, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-medium text-neutral-900">
        {row.getValue('name')}
      </span>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span className="text-neutral-600">{row.getValue('email')}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const statusStyles: Record<string, string> = {
        active: 'bg-positive-100 text-positive-700',
        pending: 'bg-warning-100 text-warning-700',
        inactive: 'bg-neutral-100 text-neutral-500',
      };
      return (
        <span
          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${statusStyles[status]}`}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <span className="text-neutral-600">{row.getValue('role')}</span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-neutral-500 tabular-nums">
        {row.getValue('createdAt')}
      </span>
    ),
  },
];

export function Default() {
  return (
    <DataTable
      columns={columns}
      data={sampleUsers}
      getRowId={(row) => row.id}
    />
  );
}

export function WithToolbar() {
  const [search, setSearch] = useState('');

  const filteredData = sampleUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DataTable columns={columns} data={filteredData} getRowId={(row) => row.id}>
      <DataTableToolbar
        searchPlaceholder="Search users..."
        searchValue={search}
        onSearchChange={setSearch}
        hasActiveFilters={search.length > 0}
        onClearFilters={() => setSearch('')}
      />
    </DataTable>
  );
}

export function WithFilters() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<{
    id: string;
    label: string;
  } | null>({ id: 'all', label: 'All Status' });

  const statusOptions = [
    { id: 'all', label: 'All Status' },
    { id: 'active', label: 'Active' },
    { id: 'pending', label: 'Pending' },
    { id: 'inactive', label: 'Inactive' },
  ];

  const filteredData = sampleUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter?.id === 'all' || user.status === statusFilter?.id;
    return matchesSearch && matchesStatus;
  });

  const hasActiveFilters = search.length > 0 || statusFilter?.id !== 'all';

  return (
    <DataTable columns={columns} data={filteredData} getRowId={(row) => row.id}>
      <DataTableToolbar
        searchPlaceholder="Search users..."
        searchValue={search}
        onSearchChange={setSearch}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSearch('');
          setStatusFilter({ id: 'all', label: 'All Status' });
        }}
      >
        <FilterSelect
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          className="w-28"
        />
      </DataTableToolbar>
    </DataTable>
  );
}

export function WithRowSelection() {
  const [selectedId, setSelectedId] = useState<string | undefined>();

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        Selected ID: {selectedId ?? 'None'}
      </p>
      <DataTable
        columns={columns}
        data={sampleUsers}
        getRowId={(row) => row.id}
        selectedRowId={selectedId}
        onRowClick={(row) => setSelectedId(row.id)}
      />
    </div>
  );
}

export function LoadingState() {
  return <DataTable columns={columns} data={[]} isLoading={true} />;
}

export function EmptyState() {
  return <DataTable columns={columns} data={[]} />;
}

export function ErrorState() {
  return (
    <DataTable
      columns={columns}
      data={[]}
      isError={true}
      onRetry={() => alert('Retry clicked')}
    />
  );
}

export function SmallPageSize() {
  return (
    <DataTable
      columns={columns}
      data={sampleUsers}
      getRowId={(row) => row.id}
      pageSizeOptions={[3, 5, 10]}
    />
  );
}
