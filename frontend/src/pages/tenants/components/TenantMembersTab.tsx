import * as React from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth, useNotification } from '../../../contexts';
import {
  listTenantMembers,
  inviteUserToTenant,
  updateTenantMember,
  removeTenantMember,
  searchUserByEmail,
} from '../../../services/tenantMembersApi';
import {
  createTenantInvitation,
  listTenantInvitations,
  cancelTenantInvitation,
} from '../../../services/tenantInvitationsApi';
import type { TenantMember } from '../../../services/tenantMembersApi';
import type { TenantInvitation } from '../../../services/tenantInvitationsApi';
import type { Tenant } from '../../../types';

interface UserTenant {
  tenant_user: {
    id: string;
    role: string;
    is_active: boolean;
    effective_permissions?: string[];
  };
  tenant: {
    id: string;
    name: string;
  };
}

interface TenantMembersTabProps {
  tenant: Tenant;
  userTenant: UserTenant | null;
  onMembersUpdate?: () => void;
}

export default function TenantMembersTab({
  tenant,
  userTenant,
  onMembersUpdate,
}: TenantMembersTabProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [members, setMembers] = React.useState<TenantMember[]>([]);
  const [invitations, setInvitations] = React.useState<TenantInvitation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<TenantMember | null>(null);

  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState('member');
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [foundUser, setFoundUser] = React.useState<any>(null);
  const [isInviting, setIsInviting] = React.useState(false);
  const [inviteMode, setInviteMode] = React.useState<'search' | 'email'>('search');

  const [editRole, setEditRole] = React.useState('member');
  const [isUpdating, setIsUpdating] = React.useState(false);

  const effectivePermissions = userTenant?.tenant_user.effective_permissions ?? [];
  const canManage = effectivePermissions.some((permission) =>
    ['member:invite', 'member:update', 'member:remove'].includes(permission)
  );

  React.useEffect(() => {
    const fetchData = async () => {
      if (!tenant?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [membersData, invitationsData] = await Promise.all([
          listTenantMembers(tenant.id),
          listTenantInvitations(tenant.id, { status: 'pending' }),
        ]);
        setMembers(membersData);
        setInvitations(invitationsData);
      } catch (err: any) {
        showError(err?.message || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [tenant?.id, showError]);

  const handleSearchUser = async () => {
    if (!tenant?.id || !inviteEmail.trim()) return;

    try {
      setIsSearching(true);
      setInviteError(null);
      const user = await searchUserByEmail(tenant.id, inviteEmail.trim());
      if (user) {
        setFoundUser(user);
      } else {
        setInviteError('User not found. Please check the email address.');
        setFoundUser(null);
      }
    } catch (err: any) {
      setInviteError(err?.message || 'Failed to search for user');
      setFoundUser(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async () => {
    if (!tenant?.id) return;

    try {
      setIsInviting(true);
      setInviteError(null);

      if (inviteMode === 'search' && foundUser) {
        // Invite existing user (immediate membership)
        await inviteUserToTenant(tenant.id, foundUser.id, inviteRole);
        showSuccess(`User ${foundUser.email} has been added successfully!`);
      } else if (inviteMode === 'email' && inviteEmail.trim()) {
        // Invite by email (pending invitation)
        await createTenantInvitation(tenant.id, {
          tenant_id: tenant.id,
          email: inviteEmail.trim(),
          role: inviteRole,
          expires_in_days: 7,
        });
        showSuccess(`Invitation sent to ${inviteEmail.trim()}! They will receive an email with instructions.`);
      } else {
        setInviteError('Please search for a user or enter an email address');
        return;
      }
      
      // Refresh data
      const [membersData, invitationsData] = await Promise.all([
        listTenantMembers(tenant.id),
        listTenantInvitations(tenant.id, { status: 'pending' }),
      ]);
      setMembers(membersData);
      setInvitations(invitationsData);
      onMembersUpdate?.();
      
      // Reset form
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('member');
      setFoundUser(null);
      setInviteError(null);
      setInviteMode('search');
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to invite user';
      setInviteError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsInviting(false);
    }
  };

  const handleEdit = async () => {
    if (!tenant?.id || !selectedMember) return;

    try {
      setIsUpdating(true);
      await updateTenantMember(tenant.id, selectedMember.user_id, { role: editRole });
      
      // Refresh members list
      const membersData = await listTenantMembers(tenant.id);
      setMembers(membersData);
      onMembersUpdate?.();
      
      showSuccess(`Member role updated to ${editRole} successfully!`);
      
      setEditDialogOpen(false);
      setSelectedMember(null);
    } catch (err: any) {
      showError(err?.message || 'Failed to update member');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!tenant?.id || !selectedMember) return;

    try {
      await removeTenantMember(tenant.id, selectedMember.user_id);
      
      // Refresh members list
      const membersData = await listTenantMembers(tenant.id);
      setMembers(membersData);
      onMembersUpdate?.();
      
      showSuccess('Member removed successfully!');
      
      setDeleteDialogOpen(false);
      setSelectedMember(null);
    } catch (err: any) {
      showError(err?.message || 'Failed to remove member');
    }
  };

  const openEditDialog = (member: TenantMember) => {
    setSelectedMember(member);
    setEditRole(member.role);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (member: TenantMember) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  const getUserDisplayName = (member: TenantMember) => {
    if (member.user) {
      if (member.user.first_name && member.user.last_name) {
        return `${member.user.first_name} ${member.user.last_name}`;
      }
      return member.user.first_name || member.user.email;
    }
    return 'Unknown User';
  };

  const getUserInitials = (member: TenantMember) => {
    if (member.user) {
      const name = getUserDisplayName(member);
      return name.charAt(0).toUpperCase();
    }
    return '?';
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Members {invitations.length > 0 && `(${invitations.length} pending invitations)`}
        </Typography>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setInviteDialogOpen(true);
              setInviteMode('search');
              setInviteEmail('');
              setFoundUser(null);
              setInviteError(null);
            }}
          >
            Invite Member
          </Button>
        )}
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Joined</TableCell>
              {canManage && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {members.length === 0 && invitations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No members yet
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {getUserInitials(member)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">
                          {getUserDisplayName(member)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.user?.email || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={member.role}
                      size="small"
                      color={
                        member.role === 'owner'
                          ? 'primary'
                          : member.role === 'admin'
                          ? 'secondary'
                          : member.role === 'editor'
                          ? 'info'
                          : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={member.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      color={member.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(member.joined_at).toLocaleDateString()}
                  </TableCell>
                  {canManage && (
                    <TableCell align="right">
                      {member.role !== 'owner' || member.user_id === user?.id ? (
                        <Box display="flex" gap={1} justifyContent="flex-end">
                          <Tooltip title="Edit Role">
                            <IconButton
                              size="small"
                              onClick={() => openEditDialog(member)}
                              disabled={member.role === 'owner' && member.user_id !== user?.id}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {member.user_id !== user?.id && (
                            <Tooltip title="Remove Member">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => openDeleteDialog(member)}
                                disabled={member.role === 'owner'}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Cannot modify owner
                        </Typography>
                      )}
                    </TableCell>
                  )}
                </TableRow>
                ))}
                {/* Pending Invitations */}
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {invitation.email.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {invitation.email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Pending invitation
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invitation.role}
                        size="small"
                        color="default"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label="Pending"
                        size="small"
                        color="warning"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.created_at).toLocaleDateString()}
                    </TableCell>
                    {canManage && (
                      <TableCell align="right">
                        <Tooltip title="Cancel Invitation">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={async () => {
                              if (window.confirm(`Cancel invitation to ${invitation.email}?`)) {
                                try {
                                  await cancelTenantInvitation(tenant.id, invitation.id);
                                  const invitationsData = await listTenantInvitations(tenant.id, { status: 'pending' });
                                  setInvitations(invitationsData);
                                  showSuccess('Invitation cancelled');
                                } catch (err: any) {
                                  showError(err?.message || 'Failed to cancel invitation');
                                }
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Member</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Mode Toggle */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
              <Button
                variant={inviteMode === 'search' ? 'contained' : 'outlined'}
                onClick={() => {
                  setInviteMode('search');
                  setFoundUser(null);
                  setInviteError(null);
                }}
                size="small"
              >
                Search Existing User
              </Button>
              <Button
                variant={inviteMode === 'email' ? 'contained' : 'outlined'}
                onClick={() => {
                  setInviteMode('email');
                  setFoundUser(null);
                  setInviteError(null);
                }}
                size="small"
              >
                Invite by Email
              </Button>
            </Box>

            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                setFoundUser(null);
                setInviteError(null);
              }}
              sx={{ mb: 2 }}
              helperText={
                inviteMode === 'search'
                  ? 'Enter the email address to search for an existing user'
                  : 'Enter the email address to send an invitation (user will be added when they register)'
              }
            />

            {inviteMode === 'search' && (
              <Button
                variant="outlined"
                onClick={handleSearchUser}
                disabled={!inviteEmail.trim() || isSearching}
                sx={{ mb: 2 }}
              >
                {isSearching ? <CircularProgress size={24} /> : 'Search User'}
              </Button>
            )}

            {inviteMode === 'search' && foundUser && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  User Found:
                </Typography>
                <Typography variant="body2">
                  {foundUser.first_name && foundUser.last_name
                    ? `${foundUser.first_name} ${foundUser.last_name}`
                    : foundUser.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {foundUser.email}
                </Typography>
              </Box>
            )}

            {inviteMode === 'email' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                An invitation email will be sent. The user will be automatically added when they register with this email address.
              </Alert>
            )}

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={inviteRole}
                label="Role"
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="editor">Editor</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                {userTenant?.tenant_user.role === 'owner' && (
                  <MenuItem value="owner">Owner</MenuItem>
                )}
              </Select>
            </FormControl>

            {inviteError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {inviteError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleInvite}
            variant="contained"
            disabled={
              isInviting ||
              !inviteEmail.trim() ||
              (inviteMode === 'search' && !foundUser)
            }
          >
            {isInviting ? <CircularProgress size={24} /> : inviteMode === 'search' ? 'Add Member' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Member Role</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedMember && (
              <>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  User: {getUserDisplayName(selectedMember)} ({selectedMember.user?.email})
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={editRole}
                    label="Role"
                    onChange={(e) => setEditRole(e.target.value)}
                    disabled={selectedMember.role === 'owner' && selectedMember.user_id !== user?.id}
                  >
                    <MenuItem value="member">Member</MenuItem>
                    <MenuItem value="editor">Editor</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    {userTenant?.tenant_user.role === 'owner' && (
                      <MenuItem value="owner">Owner</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleEdit}
            variant="contained"
            disabled={isUpdating}
          >
            {isUpdating ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Remove Member</DialogTitle>
        <DialogContent>
          {selectedMember && (
            <Typography>
              Are you sure you want to remove{' '}
              <strong>{getUserDisplayName(selectedMember)}</strong> from this tenant?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}












