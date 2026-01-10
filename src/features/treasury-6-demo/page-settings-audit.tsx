import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DownloadIcon,
  FilterIcon,
  SearchIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

import { SettingsLayout } from './components/settings-layout';
import {
  auditCategoryLabels,
  auditActionLabels,
  auditLog,
  type AuditActionCategory,
  type AuditLogEntry,
} from './data/settings';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateTime = (dateString: string) => {
  return `${formatDate(dateString)} at ${formatTime(dateString)}`;
};

const getStatusIcon = (status: 'success' | 'failure') => {
  if (status === 'success') {
    return <CheckCircleIcon className="size-4 text-positive-600" />;
  }
  return <XCircleIcon className="size-4 text-negative-600" />;
};

const exportAuditLog = (entries: AuditLogEntry[]) => {
  const headers = [
    'Timestamp',
    'Action',
    'Category',
    'Actor',
    'Actor Email',
    'Target',
    'IP Address',
    'Status',
  ];

  const rows = entries.map((entry) => [
    entry.timestamp,
    auditActionLabels[entry.action],
    auditCategoryLabels[entry.category],
    entry.actorName,
    entry.actorEmail,
    entry.targetName || '-',
    entry.ipAddress,
    entry.status,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `audit-log-${new Date().toISOString().split('T')[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const PageSettingsAudit = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    AuditActionCategory | 'all'
  >('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'success' | 'failure'
  >('all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>(
    'all'
  );

  const getDateRangeStart = () => {
    if (dateRange === 'all') return null;
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  };

  const filteredEntries = auditLog.filter((entry) => {
    const matchesSearch =
      searchQuery === '' ||
      entry.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.actorEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.targetName?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false) ||
      auditActionLabels[entry.action]
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || entry.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'all' || entry.status === statusFilter;

    const dateRangeStart = getDateRangeStart();
    const matchesDate =
      !dateRangeStart || new Date(entry.timestamp) >= dateRangeStart;

    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });

  const handleExport = () => {
    if (filteredEntries.length === 0) {
      toast.error('No entries to export');
      return;
    }
    exportAuditLog(filteredEntries);
    toast.success(`Exported ${filteredEntries.length} audit log entries`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setDateRange('all');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    dateRange !== 'all';

  return (
    <SettingsLayout
      title="Audit Log"
      description="Track all activity in your organization"
      actions={
        <Button
          onClick={handleExport}
          className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600"
        >
          <DownloadIcon className="mr-1.5 size-3.5" />
          Export CSV
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Search by user, action, or target..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-none border-neutral-200 pl-10 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 items-center gap-2 border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
              >
                <FilterIcon className="size-3.5" />
                Category:{' '}
                <span className="capitalize">
                  {categoryFilter === 'all'
                    ? 'All'
                    : auditCategoryLabels[categoryFilter]}
                </span>
                <ChevronDownIcon className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none">
              <DropdownMenuItem
                onClick={() => setCategoryFilter('all')}
                className="rounded-none text-xs"
              >
                All Categories
              </DropdownMenuItem>
              {(Object.keys(auditCategoryLabels) as AuditActionCategory[]).map(
                (category) => (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                    className="rounded-none text-xs"
                  >
                    {auditCategoryLabels[category]}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 items-center gap-2 border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
              >
                Status: <span className="capitalize">{statusFilter}</span>
                <ChevronDownIcon className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none">
              <DropdownMenuItem
                onClick={() => setStatusFilter('all')}
                className="rounded-none text-xs"
              >
                All
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusFilter('success')}
                className="rounded-none text-xs"
              >
                Success
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusFilter('failure')}
                className="rounded-none text-xs"
              >
                Failure
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 items-center gap-2 border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
              >
                <CalendarIcon className="size-3.5" />
                {dateRange === 'all'
                  ? 'All Time'
                  : dateRange === '7d'
                    ? 'Last 7 Days'
                    : dateRange === '30d'
                      ? 'Last 30 Days'
                      : 'Last 90 Days'}
                <ChevronDownIcon className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none">
              <DropdownMenuItem
                onClick={() => setDateRange('all')}
                className="rounded-none text-xs"
              >
                All Time
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDateRange('7d')}
                className="rounded-none text-xs"
              >
                Last 7 Days
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDateRange('30d')}
                className="rounded-none text-xs"
              >
                Last 30 Days
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDateRange('90d')}
                className="rounded-none text-xs"
              >
                Last 90 Days
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex h-9 items-center gap-1.5 px-3 text-xs font-medium text-neutral-500 hover:text-neutral-700"
            >
              <XIcon className="size-3.5" />
              Clear Filters
            </button>
          )}
        </div>

        {/* Audit Log Table */}
        <div className="border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs">
                <th className="px-4 py-3 font-medium text-neutral-500">
                  Action
                </th>
                <th className="px-4 py-3 font-medium text-neutral-500">User</th>
                <th className="px-4 py-3 font-medium text-neutral-500">
                  Target
                </th>
                <th className="px-4 py-3 font-medium text-neutral-500">
                  IP Address
                </th>
                <th className="px-4 py-3 font-medium text-neutral-500">Date</th>
                <th className="px-4 py-3 text-center font-medium text-neutral-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-neutral-900">
                        {auditActionLabels[entry.action]}
                      </span>
                      <span className="inline-flex w-fit items-center rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 uppercase">
                        {auditCategoryLabels[entry.category]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100">
                        <span className="text-xs font-bold text-neutral-600">
                          {entry.actorName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">
                          {entry.actorName}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {entry.actorEmail}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {entry.targetName ? (
                      <div>
                        <p className="font-medium text-neutral-900">
                          {entry.targetName}
                        </p>
                        <p className="text-xs text-neutral-500 capitalize">
                          {entry.targetType}
                        </p>
                      </div>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-neutral-600">
                      {entry.ipAddress}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-neutral-900">
                        {formatDate(entry.timestamp)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatTime(entry.timestamp)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusIcon(entry.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEntries.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-neutral-500">
                No audit log entries found
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-4">
            <span>
              Showing {filteredEntries.length} of {auditLog.length} entries
            </span>
            {hasActiveFilters && (
              <>
                <span className="text-neutral-300">•</span>
                <span>Filters applied</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <CheckCircleIcon className="size-3.5 text-positive-600" />
              {
                filteredEntries.filter((e) => e.status === 'success').length
              }{' '}
              successful
            </span>
            <span className="flex items-center gap-1.5">
              <XCircleIcon className="size-3.5 text-negative-600" />
              {
                filteredEntries.filter((e) => e.status === 'failure').length
              }{' '}
              failed
            </span>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
};
