import { Link, useParams } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  Users2Icon,
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

import { SettingsLayout } from './components/settings-layout';
import {
  getTeamById,
  getTeamMembers,
  type Member,
  members,
  teams,
} from './data/settings';

// Teams List Page
export const PageSettingsTeams = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }
    toast.success(`Team "${teamName}" created`);
    setCreateOpen(false);
    setTeamName('');
    setTeamDescription('');
    setSelectedMembers([]);
  };

  const handleDelete = (teamId: string, teamName: string) => {
    toast.success(`Team "${teamName}" deleted`);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <SettingsLayout
      title="Teams"
      description="Organize members into groups"
      actions={
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600">
              <PlusIcon className="mr-1.5 size-3.5" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-none">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold text-neutral-900">
                Create Team
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Create a new team to group members together
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-700">
                  Team Name
                </label>
                <Input
                  placeholder="e.g., Treasury Operations"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="h-10 rounded-none border-neutral-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-700">
                  Description{' '}
                  <span className="font-normal text-neutral-400">
                    (optional)
                  </span>
                </label>
                <textarea
                  placeholder="What does this team do?"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  rows={2}
                  className="w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-700">
                  Members{' '}
                  <span className="font-normal text-neutral-400">
                    (optional)
                  </span>
                </label>
                <div className="max-h-40 space-y-1 overflow-y-auto border border-neutral-200 p-2">
                  {members
                    .filter((m) => m.status === 'active')
                    .map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center gap-3 px-2 py-1.5 text-sm hover:bg-neutral-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => toggleMember(member.id)}
                          className="rounded border-neutral-300"
                        />
                        <div className="flex size-6 items-center justify-center rounded-full bg-neutral-100">
                          <span className="text-[10px] font-bold text-neutral-600">
                            {member.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </span>
                        </div>
                        <span>{member.name}</span>
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
                  Create Team
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-4">
        {teams.length === 0 ? (
          <div className="border border-neutral-200 px-4 py-12 text-center">
            <Users2Icon className="mx-auto size-10 text-neutral-300" />
            <p className="mt-3 text-sm text-neutral-500">No teams yet</p>
            <p className="mt-1 text-xs text-neutral-400">
              Create a team to organize your members
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => {
              const teamMembers = getTeamMembers(team.id);
              return (
                <div
                  key={team.id}
                  className="group border border-neutral-200 bg-white transition-colors hover:border-neutral-300"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-neutral-100">
                          <Users2Icon className="size-5 text-neutral-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-neutral-900">
                            {team.name}
                          </h3>
                          <p className="text-xs text-neutral-500">
                            {teamMembers.length} member
                            {teamMembers.length !== 1 && 's'}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex size-7 items-center justify-center text-neutral-400 opacity-0 group-hover:opacity-100 hover:bg-neutral-100 hover:text-neutral-600"
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="rounded-none"
                        >
                          <DropdownMenuItem
                            asChild
                            className="rounded-none text-xs"
                          >
                            <Link
                              to="/settings/teams/$teamId"
                              params={{ teamId: team.id }}
                            >
                              <PencilIcon className="mr-2 size-3.5" />
                              Edit Team
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(team.id, team.name)}
                            className="rounded-none text-xs text-negative-600"
                          >
                            <Trash2Icon className="mr-2 size-3.5" />
                            Delete Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {team.description && (
                      <p className="mt-3 line-clamp-2 text-xs text-neutral-500">
                        {team.description}
                      </p>
                    )}
                    {/* Member Avatars */}
                    <div className="mt-4 flex items-center gap-1">
                      {teamMembers.slice(0, 5).map((member, idx) => (
                        <div
                          key={member.id}
                          className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-neutral-100"
                          style={{ marginLeft: idx > 0 ? '-8px' : 0 }}
                        >
                          <span className="text-[9px] font-bold text-neutral-600">
                            {member.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </span>
                        </div>
                      ))}
                      {teamMembers.length > 5 && (
                        <div
                          className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-neutral-200"
                          style={{ marginLeft: '-8px' }}
                        >
                          <span className="text-[9px] font-bold text-neutral-600">
                            +{teamMembers.length - 5}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Link
                    to="/settings/teams/$teamId"
                    params={{ teamId: team.id }}
                    className="flex items-center justify-between border-t border-neutral-100 px-4 py-2.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  >
                    View Team
                    <ChevronRightIcon className="size-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SettingsLayout>
  );
};

// Team Detail Page
export const PageSettingsTeamDetail = () => {
  const { teamId } = useParams({ from: '/_app/settings/teams/$teamId' });
  const team = getTeamById(teamId);
  const teamMembers = team ? getTeamMembers(teamId) : [];

  const [editNameOpen, setEditNameOpen] = useState(false);
  const [teamName, setTeamName] = useState(team?.name ?? '');
  const [teamDescription, setTeamDescription] = useState(
    team?.description ?? ''
  );
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const availableMembers = members.filter(
    (m) => m.status === 'active' && !team?.memberIds.includes(m.id)
  );

  const handleUpdateDetails = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Team details updated');
    setEditNameOpen(false);
  };

  const handleAddMember = (member: Member) => {
    toast.success(`${member.name} added to team`);
    setAddMemberOpen(false);
  };

  const handleRemoveMember = (member: Member) => {
    toast.success(`${member.name} removed from team`);
  };

  const handleDeleteTeam = () => {
    toast.success('Team deleted');
    // In real app, navigate back to teams list
  };

  if (!team) {
    return (
      <SettingsLayout
        title="Team Not Found"
        description="The requested team could not be found"
      >
        <div className="py-8 text-center">
          <Link
            to="/settings/teams"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            Back to Teams
          </Link>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout
      title={team.name}
      description={team.description ?? 'No description'}
      actions={
        <div className="flex items-center gap-2">
          <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
              >
                <PencilIcon className="mr-1.5 size-3.5" />
                Edit Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-none">
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold text-neutral-900">
                  Edit Team Details
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateDetails} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-700">
                    Team Name
                  </label>
                  <Input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="h-10 rounded-none border-neutral-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-700">
                    Description
                  </label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    rows={2}
                    className="w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
                <DialogFooter>
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
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button
            variant="secondary"
            onClick={handleDeleteTeam}
            className="h-8 rounded-none border-negative-300 px-4 text-xs font-medium text-negative-600 hover:bg-negative-50"
          >
            <Trash2Icon className="mr-1.5 size-3.5" />
            Delete Team
          </Button>
        </div>
      }
    >
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to="/settings/teams"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to Teams
        </Link>
      </div>

      {/* Team Members */}
      <div className="border border-neutral-200">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Team Members
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {teamMembers.length} member{teamMembers.length !== 1 && 's'}
            </p>
          </div>
          <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
              >
                <PlusIcon className="mr-1.5 size-3.5" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm rounded-none">
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold text-neutral-900">
                  Add Member to Team
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                {availableMembers.length === 0 ? (
                  <p className="py-4 text-center text-sm text-neutral-500">
                    All members are already in this team
                  </p>
                ) : (
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {availableMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleAddMember(member)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50"
                      >
                        <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100">
                          <span className="text-xs font-bold text-neutral-600">
                            {member.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">
                            {member.name}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {member.email}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {teamMembers.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-neutral-500">No members in this team</p>
            <p className="mt-1 text-xs text-neutral-400">
              Add members to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
              >
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
                    <p className="text-sm font-medium text-neutral-900">
                      {member.name}
                    </p>
                    <p className="text-xs text-neutral-500">{member.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member)}
                  className="flex size-7 items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-negative-600"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Info */}
      <div className="mt-6 text-xs text-neutral-400">
        Created on {team.createdAt} by {team.createdBy}
      </div>
    </SettingsLayout>
  );
};
