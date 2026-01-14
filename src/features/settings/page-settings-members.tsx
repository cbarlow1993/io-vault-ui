import {
  ChevronDownIcon,
  MailIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  UserMinusIcon,
  UserPlusIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

import { getStatusStyles } from '@/features/shared/lib/status-styles';

import { SettingsLayout } from './components/settings-layout';
import {
  members,
  type MemberStatus,
  type PlatformRoleId,
  platformRoles,
  workspaces,
} from './data/settings';

const getRoleStyles = (role: PlatformRoleId) => {
  switch (role) {
    case 'owner':
      return 'bg-purple-100 text-purple-700';
    case 'admin':
      return 'bg-blue-100 text-blue-700';
    case 'billing':
      return 'bg-emerald-100 text-emerald-700';
    case 'member':
      return 'text-neutral-600';
    case 'auditor':
      return 'bg-amber-100 text-amber-700';
  }
};

export const PageSettingsMembers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<PlatformRoleId | 'all'>('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<PlatformRoleId>('member');

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || member.status === statusFilter;
    const matchesRole =
      roleFilter === 'all' || member.platformRole === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const emails = inviteEmails
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      toast.error('Please enter at least one email address');
      return;
    }
    toast.success(
      `Invitation sent to ${emails.length} ${emails.length === 1 ? 'person' : 'people'}`
    );
    setInviteOpen(false);
    setInviteEmails('');
    setInviteRole('member');
  };

  const handleResendInvite = (memberId: string) => {
    toast.success('Invitation resent');
  };

  const handleDeactivate = (memberId: string) => {
    toast.success('Member deactivated');
  };

  const handleReactivate = (memberId: string) => {
    toast.success('Member reactivated');
  };

  const handleRemove = (memberId: string) => {
    toast.success('Member removed from organization');
  };

  const handleChangeRole = (memberId: string, newRole: PlatformRoleId) => {
    toast.success('Role updated');
  };

  return (
    <SettingsLayout
      title="Members"
      description="Manage people in your organization"
      actions={
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600">
              <PlusIcon className="mr-1.5 size-3.5" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-none">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold text-neutral-900">
                Invite Members
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Send invitations to join your organization
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-700">
                  Email Addresses
                </label>
                <textarea
                  placeholder="Enter email addresses, separated by commas"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  rows={3}
                  className="w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />
                <p className="text-[11px] text-neutral-400">
                  Separate multiple emails with commas
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-700">
                  Default Role
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-10 w-full items-center justify-between border border-neutral-200 bg-white px-3 text-sm hover:bg-neutral-50"
                    >
                      <span className="capitalize">{inviteRole}</span>
                      <ChevronDownIcon className="size-4 text-neutral-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-full min-w-[200px] rounded-none"
                  >
                    {platformRoles
                      .filter((r) => r.id !== 'owner')
                      .map((role) => (
                        <DropdownMenuItem
                          key={role.id}
                          onClick={() => setInviteRole(role.id)}
                          className="rounded-none"
                        >
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {role.name}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {role.description}
                            </p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-700">
                  Add to Workspaces{' '}
                  <span className="font-normal text-neutral-400">
                    (optional)
                  </span>
                </label>
                <div className="max-h-32 space-y-1 overflow-y-auto border border-neutral-200 p-2">
                  {workspaces
                    .filter((ws) => ws.status === 'active')
                    .map((workspace) => (
                      <label
                        key={workspace.id}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-neutral-50"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-neutral-300"
                        />
                        {workspace.name}
                      </label>
                    ))}
                </div>
              </div>
              <DialogFooter className="mt-6">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600"
                >
                  <MailIcon className="mr-1.5 size-3.5" />
                  Send Invitations
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Search by name or email..."
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
                onClick={() => setStatusFilter('active')}
                className="rounded-none text-xs"
              >
                Active
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusFilter('pending')}
                className="rounded-none text-xs"
              >
                Pending
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusFilter('deactivated')}
                className="rounded-none text-xs"
              >
                Deactivated
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 items-center gap-2 border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
              >
                Role: <span className="capitalize">{roleFilter}</span>
                <ChevronDownIcon className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none">
              <DropdownMenuItem
                onClick={() => setRoleFilter('all')}
                className="rounded-none text-xs"
              >
                All
              </DropdownMenuItem>
              {platformRoles.map((role) => (
                <DropdownMenuItem
                  key={role.id}
                  onClick={() => setRoleFilter(role.id)}
                  className="rounded-none text-xs capitalize"
                >
                  {role.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Members Table */}
        <div className="border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs">
                <th className="px-4 py-3 font-medium text-neutral-500">
                  Member
                </th>
                <th className="px-4 py-3 font-medium text-neutral-500">Role</th>
                <th className="px-4 py-3 font-medium text-neutral-500">
                  Workspaces
                </th>
                <th className="px-4 py-3 font-medium text-neutral-500">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-neutral-500">
                  Joined
                </th>
                <th className="px-4 py-3 text-right font-medium text-neutral-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100">
                        <span className="text-xs font-bold text-neutral-600">
                          {member.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">
                          {member.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={member.platformRole === 'owner'}
                          className={cn(
                            'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium capitalize',
                            getRoleStyles(member.platformRole),
                            member.platformRole !== 'owner' &&
                              'cursor-pointer hover:opacity-80'
                          )}
                        >
                          {member.platformRole}
                          {member.platformRole !== 'owner' && (
                            <ChevronDownIcon className="size-3" />
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      {member.platformRole !== 'owner' && (
                        <DropdownMenuContent
                          align="start"
                          className="rounded-none"
                        >
                          {platformRoles
                            .filter((r) => r.id !== 'owner')
                            .map((role) => (
                              <DropdownMenuItem
                                key={role.id}
                                onClick={() =>
                                  handleChangeRole(member.id, role.id)
                                }
                                className="rounded-none text-xs capitalize"
                              >
                                {role.name}
                              </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                      )}
                    </DropdownMenu>
                  </td>
                  <td className="px-4 py-3">
                    {member.workspaceIds.length > 0 ? (
                      <span className="text-xs text-neutral-600">
                        {member.workspaceIds.length} workspace
                        {member.workspaceIds.length !== 1 && 's'}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-block rounded px-2 py-0.5 text-xs font-medium capitalize',
                        getStatusStyles(member.status)
                      )}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {member.joinedAt}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex size-7 items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-none">
                        {member.status === 'pending' && (
                          <DropdownMenuItem
                            onClick={() => handleResendInvite(member.id)}
                            className="rounded-none text-xs"
                          >
                            <MailIcon className="mr-2 size-3.5" />
                            Resend Invite
                          </DropdownMenuItem>
                        )}
                        {member.status === 'active' &&
                          member.platformRole !== 'owner' && (
                            <DropdownMenuItem
                              onClick={() => handleDeactivate(member.id)}
                              className="rounded-none text-xs"
                            >
                              <UserMinusIcon className="mr-2 size-3.5" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                        {member.status === 'deactivated' && (
                          <DropdownMenuItem
                            onClick={() => handleReactivate(member.id)}
                            className="rounded-none text-xs"
                          >
                            <UserPlusIcon className="mr-2 size-3.5" />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                        {member.platformRole !== 'owner' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRemove(member.id)}
                              className="rounded-none text-xs text-negative-600"
                            >
                              <XIcon className="mr-2 size-3.5" />
                              Remove from Org
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMembers.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-neutral-500">No members found</p>
              <p className="mt-1 text-xs text-neutral-400">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span>
            {members.filter((m) => m.status === 'active').length} active
          </span>
          <span className="text-neutral-300">•</span>
          <span>
            {members.filter((m) => m.status === 'pending').length} pending
          </span>
          <span className="text-neutral-300">•</span>
          <span>
            {members.filter((m) => m.status === 'deactivated').length}{' '}
            deactivated
          </span>
        </div>
      </div>
    </SettingsLayout>
  );
};
