import {
  ArrowLeftIcon,
  ChevronDownIcon,
  LayoutGridIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

import { SettingsLayout } from './components/settings-layout';
import {
  type EffectiveWorkspaceMember,
  getRoleById,
  getTeamById,
  getWorkspaceMembers,
  getWorkspaceTeams,
  members,
  type RoleId,
  roles,
  type Team,
  teams,
  type Workspace,
  type WorkspaceRoleId,
  workspaces,
} from './data/settings';

// Workspaces List Page
export const PageSettingsWorkspaces = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null
  );

  // If a workspace is selected, show the detail page
  if (selectedWorkspace) {
    return (
      <PageSettingsWorkspaceDetail
        workspace={selectedWorkspace}
        onBack={() => setSelectedWorkspace(null)}
      />
    );
  }

  return (
    <SettingsLayout
      title="Workspaces"
      description="Manage workspaces to organize your vaults and team access"
      actions={
        <Button
          className="h-8 gap-2 rounded-none bg-brand-500 text-white hover:bg-brand-600"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <PlusIcon className="size-4" strokeWidth={1.5} />
          Create Workspace
        </Button>
      }
    >
      {/* Workspaces Grid */}
      <div className="grid grid-cols-3 gap-4">
        {workspaces.map((workspace) => {
          const workspaceMembers = getWorkspaceMembers(workspace.id);
          return (
            <div
              key={workspace.id}
              className="group cursor-pointer border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300"
              onClick={() => setSelectedWorkspace(workspace)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center bg-neutral-100">
                    <LayoutGridIcon
                      className="size-5 text-neutral-600"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">
                      {workspace.name}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {workspaceMembers.length} members
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="rounded-none p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-neutral-100">
                      <MoreHorizontalIcon className="size-4 text-neutral-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 rounded-none"
                  >
                    <DropdownMenuItem
                      className="rounded-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWorkspace(workspace);
                      }}
                    >
                      <PencilIcon className="mr-2 size-4" />
                      Edit Workspace
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600 rounded-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2Icon className="mr-2 size-4" />
                      Delete Workspace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {workspace.description && (
                <p className="mt-3 line-clamp-2 text-sm text-neutral-600">
                  {workspace.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-neutral-500">
                <span>
                  Created {new Date(workspace.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Workspace Dialog */}
      <CreateWorkspaceDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </SettingsLayout>
  );
};

// Workspace Detail Page
const PageSettingsWorkspaceDetail = ({
  workspace,
  onBack,
}: {
  workspace: Workspace;
  onBack: () => void;
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isAddTeamDialogOpen, setIsAddTeamDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const workspaceMembers = getWorkspaceMembers(workspace.id);
  const workspaceTeams = getWorkspaceTeams(workspace.id);

  return (
    <SettingsLayout
      title={workspace.name}
      description={workspace.description || 'No description'}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-8 gap-2 rounded-none"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <PencilIcon className="size-4" strokeWidth={1.5} />
            Edit
          </Button>
          <Button
            variant="destructive-secondary"
            className="h-8 gap-2 rounded-none"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2Icon className="size-4" strokeWidth={1.5} />
            Delete
          </Button>
        </div>
      }
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeftIcon className="size-4" strokeWidth={1.5} />
        Back to Workspaces
      </button>

      {/* Workspace Info */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Teams</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">
            {workspaceTeams.length}
          </p>
        </div>
        <div className="border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Members</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">
            {workspaceMembers.length}
          </p>
        </div>
        <div className="border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Vaults</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">
            {workspace.stats.vaults}
          </p>
        </div>
        <div className="border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Created</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">
            {new Date(workspace.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Teams Section */}
      <div className="mb-6 border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-4 text-neutral-500" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-neutral-900">Teams</h2>
            <span className="text-sm text-neutral-500">
              ({workspaceTeams.length})
            </span>
          </div>
          <Button
            variant="secondary"
            className="h-7 gap-2 rounded-none text-xs"
            onClick={() => setIsAddTeamDialogOpen(true)}
          >
            <PlusIcon className="size-3" strokeWidth={1.5} />
            Add Team
          </Button>
        </div>

        {/* Explanation */}
        <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3">
          <p className="text-xs text-neutral-600">
            When a team is added to a workspace, all team members automatically
            receive the assigned workspace role. Individual members can be given
            role overrides if they need different permissions than their team.
          </p>
        </div>

        {workspaceTeams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <UsersIcon className="size-8 text-neutral-300" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-neutral-500">
              No teams assigned to this workspace
            </p>
            <Button
              variant="secondary"
              className="mt-4 h-8 gap-2 rounded-none"
              onClick={() => setIsAddTeamDialogOpen(true)}
            >
              <PlusIcon className="size-4" strokeWidth={1.5} />
              Add Team
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="py-3 pr-4 pl-4 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase">
                  Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase">
                  Workspace Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase">
                  Members
                </th>
                <th className="py-3 pr-4 pl-4 text-right text-xs font-medium tracking-wider text-neutral-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {workspaceTeams.map((team) => (
                <WorkspaceTeamRow key={team.id} team={team} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Members Section */}
      <div className="border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-4 text-neutral-500" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-neutral-900">Members</h2>
            <span className="text-sm text-neutral-500">
              ({workspaceMembers.length})
            </span>
          </div>
          <Button
            variant="secondary"
            className="h-7 gap-2 rounded-none text-xs"
            onClick={() => setIsAddMemberDialogOpen(true)}
          >
            <UserPlusIcon className="size-3" strokeWidth={1.5} />
            Add Member
          </Button>
        </div>

        {workspaceMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <UsersIcon className="size-8 text-neutral-300" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-neutral-500">
              No members in this workspace
            </p>
            <Button
              variant="secondary"
              className="mt-4 h-8 gap-2 rounded-none"
              onClick={() => setIsAddMemberDialogOpen(true)}
            >
              <UserPlusIcon className="size-4" strokeWidth={1.5} />
              Add Member
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="py-3 pr-4 pl-4 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase">
                  Member
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase">
                  Role
                </th>
                <th className="py-3 pr-4 pl-4 text-right text-xs font-medium tracking-wider text-neutral-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {workspaceMembers.map((wm) => {
                const role = getRoleById(wm.workspaceRole);
                if (!role) return null;

                return <WorkspaceMemberRow key={wm.id} member={wm} />;
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Workspace Dialog */}
      <EditWorkspaceDialog
        workspace={workspace}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
      />

      {/* Add Member Dialog */}
      <AddWorkspaceMemberDialog
        workspaceId={workspace.id}
        existingMemberIds={workspaceMembers.map((wm) => wm.id)}
        isOpen={isAddMemberDialogOpen}
        onClose={() => setIsAddMemberDialogOpen(false)}
      />

      {/* Add Team Dialog */}
      <AddWorkspaceTeamDialog
        existingTeamIds={workspaceTeams.map((t) => t.id)}
        isOpen={isAddTeamDialogOpen}
        onClose={() => setIsAddTeamDialogOpen(false)}
      />

      {/* Delete Workspace Dialog */}
      <DeleteWorkspaceDialog
        workspace={workspace}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={onBack}
      />
    </SettingsLayout>
  );
};

// Workspace Team Row
const WorkspaceTeamRow = ({
  team,
}: {
  team: Team & { workspaceRole: WorkspaceRoleId };
}) => {
  const [currentRole, setCurrentRole] = useState<WorkspaceRoleId>(
    team.workspaceRole
  );
  const role = getRoleById(currentRole);

  return (
    <tr className="border-b border-neutral-100 last:border-b-0">
      <td className="py-3 pr-4 pl-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 text-blue-700 flex size-8 items-center justify-center text-sm font-medium">
            <UsersIcon className="size-4" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">{team.name}</p>
            {team.description && (
              <p className="text-xs text-neutral-500">{team.description}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium capitalize hover:bg-neutral-50"
            >
              {role?.name || currentRole}
              <ChevronDownIcon className="size-3.5 text-neutral-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-none">
            {roles.map((r) => (
              <DropdownMenuItem
                key={r.id}
                onClick={() => {
                  setCurrentRole(r.id);
                  toast.success(`Team role updated to ${r.name}`);
                }}
                className="rounded-none text-xs capitalize"
              >
                {r.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-neutral-600">
          {team.memberIds.length} members
        </span>
      </td>
      <td className="py-3 pr-4 pl-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-none p-1 hover:bg-neutral-100">
              <MoreHorizontalIcon className="size-4 text-neutral-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-none">
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 rounded-none"
              onClick={() => toast.success('Team removed from workspace')}
            >
              <XIcon className="mr-2 size-4" />
              Remove Team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
};

// Get source display info
const getSourceDisplay = (member: EffectiveWorkspaceMember) => {
  const team = member.sourceTeamId ? getTeamById(member.sourceTeamId) : null;

  switch (member.source) {
    case 'direct':
      return {
        label: 'Direct',
        description: 'Added directly to workspace',
        className: 'bg-neutral-100 text-neutral-600',
      };
    case 'team':
      return {
        label: team?.name || 'Team',
        description: `Inherited from ${team?.name || 'team'}`,
        className: 'bg-blue-100 text-blue-700',
      };
    case 'override':
      const inheritedRole = member.inheritedRole
        ? getRoleById(member.inheritedRole)
        : null;
      return {
        label: `Override (${team?.name || 'Team'})`,
        description: `Overriding ${inheritedRole?.name || 'inherited'} role from ${team?.name || 'team'}`,
        className: 'bg-amber-100 text-amber-700',
      };
  }
};

// Workspace Member Row
const WorkspaceMemberRow = ({
  member,
}: {
  member: EffectiveWorkspaceMember;
}) => {
  const [currentRole, setCurrentRole] = useState<WorkspaceRoleId>(
    member.workspaceRole
  );
  const role = getRoleById(currentRole);
  const sourceDisplay = getSourceDisplay(member);

  return (
    <tr className="border-b border-neutral-100 last:border-b-0">
      <td className="py-3 pr-4 pl-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center bg-neutral-200 text-sm font-medium text-neutral-700">
            {member.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">
              {member.name}
            </p>
            <p className="text-xs text-neutral-500">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${sourceDisplay.className}`}
          title={sourceDisplay.description}
        >
          {sourceDisplay.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium capitalize hover:bg-neutral-50"
            >
              {role?.name || currentRole}
              <ChevronDownIcon className="size-3.5 text-neutral-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-none">
            {roles.map((r) => (
              <DropdownMenuItem
                key={r.id}
                onClick={() => {
                  setCurrentRole(r.id);
                  const isTeamMember = member.source === 'team';
                  if (isTeamMember) {
                    toast.success(`Role override created: ${r.name}`);
                  } else {
                    toast.success(`Role updated to ${r.name}`);
                  }
                }}
                className="rounded-none text-xs capitalize"
              >
                {r.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="py-3 pr-4 pl-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-none p-1 hover:bg-neutral-100">
              <MoreHorizontalIcon className="size-4 text-neutral-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-none">
            {member.source === 'override' && (
              <DropdownMenuItem
                className="rounded-none"
                onClick={() =>
                  toast.success('Override removed, reverting to team role')
                }
              >
                <XIcon className="mr-2 size-4" />
                Remove Override
              </DropdownMenuItem>
            )}
            {member.source === 'direct' && (
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 rounded-none"
                onClick={() => toast.success('Member removed from workspace')}
              >
                <XIcon className="mr-2 size-4" />
                Remove from Workspace
              </DropdownMenuItem>
            )}
            {member.source === 'team' && (
              <DropdownMenuItem
                className="rounded-none"
                onClick={() =>
                  toast.info(
                    'To remove this member, remove them from the team or remove the team from this workspace'
                  )
                }
              >
                <UsersIcon className="mr-2 size-4" />
                Inherited from Team
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
};

// Create Workspace Dialog
const CreateWorkspaceDialog = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Workspace created successfully');
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-none sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>
            Create a new workspace to organize your vaults and team access.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">Name</p>
              <Input
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
                placeholder="Enter workspace name"
                className="rounded-none"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">
                Description (optional)
              </p>
              <Input
                value={description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDescription(e.target.value)
                }
                placeholder="Enter workspace description"
                className="rounded-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="rounded-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-none bg-brand-500 text-white hover:bg-brand-600"
              disabled={!name.trim()}
            >
              Create Workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Edit Workspace Dialog
const EditWorkspaceDialog = ({
  workspace,
  isOpen,
  onClose,
}: {
  workspace: Workspace;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Workspace updated successfully');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-none sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Workspace</DialogTitle>
          <DialogDescription>
            Update the workspace name and description.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">Name</p>
              <Input
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
                className="rounded-none"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">
                Description (optional)
              </p>
              <Input
                value={description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDescription(e.target.value)
                }
                className="rounded-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="rounded-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-none bg-brand-500 text-white hover:bg-brand-600"
              disabled={!name.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Add Workspace Member Dialog
const AddWorkspaceMemberDialog = ({
  workspaceId,
  existingMemberIds,
  isOpen,
  onClose,
}: {
  workspaceId: string;
  existingMemberIds: string[];
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleId>('viewer');

  // Filter out members already in this workspace
  const availableMembers = members.filter(
    (m) => m.status === 'active' && !existingMemberIds.includes(m.id)
  );

  const memberOptions = availableMembers.map((m) => ({
    id: m.id,
    label: `${m.name} (${m.email})`,
  }));

  const selectedRoleData = getRoleById(selectedRole);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Member added to workspace');
    setSelectedMember(null);
    setSelectedRole('viewer');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-none sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Member to Workspace</DialogTitle>
          <DialogDescription>
            Select a member and assign their role in this workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">Member</p>
              {availableMembers.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  All active members are already in this workspace
                </p>
              ) : (
                <Select
                  value={selectedMember}
                  onChange={setSelectedMember}
                  options={memberOptions}
                  placeholder="Select a member"
                />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">Role</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between border border-neutral-200 bg-white px-3 text-sm hover:bg-neutral-50"
                  >
                    <span className="capitalize">
                      {selectedRoleData?.name || selectedRole}
                    </span>
                    <ChevronDownIcon className="size-4 text-neutral-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-full min-w-[200px] rounded-none"
                >
                  {roles.map((role) => (
                    <DropdownMenuItem
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
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
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="rounded-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-none bg-brand-500 text-white hover:bg-brand-600"
              disabled={!selectedMember}
            >
              Add to Workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Add Workspace Team Dialog
const AddWorkspaceTeamDialog = ({
  existingTeamIds,
  isOpen,
  onClose,
}: {
  existingTeamIds: string[];
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [selectedTeam, setSelectedTeam] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleId>('viewer');

  // Filter out teams already in this workspace
  const availableTeams = teams.filter((t) => !existingTeamIds.includes(t.id));

  const teamOptions = availableTeams.map((t) => ({
    id: t.id,
    label: `${t.name} (${t.memberIds.length} members)`,
  }));

  const selectedRoleData = getRoleById(selectedRole);
  const selectedTeamData = selectedTeam
    ? teams.find((t) => t.id === selectedTeam.id)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(
      `Team added to workspace with ${selectedRoleData?.name || selectedRole} role`
    );
    setSelectedTeam(null);
    setSelectedRole('viewer');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-none sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Team to Workspace</DialogTitle>
          <DialogDescription>
            All members of the team will automatically receive the assigned
            workspace role. Individual overrides can be set later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">Team</p>
              {availableTeams.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  All teams are already assigned to this workspace
                </p>
              ) : (
                <Select
                  value={selectedTeam}
                  onChange={setSelectedTeam}
                  options={teamOptions}
                  placeholder="Select a team"
                />
              )}
            </div>
            {selectedTeamData && (
              <div className="rounded-none border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs text-neutral-600">
                  <span className="font-medium">
                    {selectedTeamData.memberIds.length} members
                  </span>{' '}
                  will inherit the workspace role
                </p>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">
                Workspace Role
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between border border-neutral-200 bg-white px-3 text-sm hover:bg-neutral-50"
                  >
                    <span className="capitalize">
                      {selectedRoleData?.name || selectedRole}
                    </span>
                    <ChevronDownIcon className="size-4 text-neutral-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-full min-w-[200px] rounded-none"
                >
                  {roles.map((role) => (
                    <DropdownMenuItem
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
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
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="rounded-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-none bg-brand-500 text-white hover:bg-brand-600"
              disabled={!selectedTeam}
            >
              Add Team
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Delete Workspace Dialog
const DeleteWorkspaceDialog = ({
  workspace,
  isOpen,
  onClose,
  onDelete,
}: {
  workspace: Workspace;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
}) => {
  const [confirmName, setConfirmName] = useState('');

  const handleDelete = () => {
    toast.success('Workspace deleted');
    onClose();
    onDelete();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-none sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete Workspace</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the
            workspace and remove all member assignments.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4 text-sm text-neutral-700">
            To confirm, type{' '}
            <span className="font-semibold">{workspace.name}</span> below:
          </p>
          <Input
            value={confirmName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setConfirmName(e.target.value)
            }
            placeholder="Enter workspace name"
            className="rounded-none"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="rounded-none"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            className="rounded-none"
            disabled={confirmName !== workspace.name}
          >
            Delete Workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
