import * as React from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import type { Tenant } from '../../../types';

interface UserTenant {
  tenant_user: {
    id: string;
    role: string;
    is_active: boolean;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

interface TenantHeaderProps {
  tenant: Tenant;
  userTenant: UserTenant | null;
  canManageSettings: boolean;
  canManageMembers: boolean;
  canDelete: boolean;
  onDeleteClick: () => void;
  onSettingsClick: () => void;
  onMembersClick: () => void;
}

export default function TenantHeader({
  tenant,
  userTenant,
  canManageSettings,
  canManageMembers,
  canDelete,
  onDeleteClick,
  onSettingsClick,
  onMembersClick,
}: TenantHeaderProps) {
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleSettingsClick = () => {
    handleMenuClose();
    onSettingsClick();
  };

  const handleMembersClick = () => {
    handleMenuClose();
    onMembersClick();
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    onDeleteClick();
  };

  return (
    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            {userTenant && (
              <Chip
                label={userTenant.tenant_user.role}
                size="small"
                color={
                  userTenant.tenant_user.role === 'owner'
                    ? 'primary'
                    : userTenant.tenant_user.role === 'admin'
                    ? 'secondary'
                    : userTenant.tenant_user.role === 'editor'
                    ? 'info'
                    : 'default'
                }
              />
            )}
            {tenant.is_verified && (
              <Chip label="Verified" size="small" color="success" />
            )}
            {!tenant.is_active && (
              <Chip label="Inactive" size="small" color="error" />
            )}
            <Chip label={tenant.subscription_tier} size="small" variant="outlined" />
          </Box>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          {(canManageSettings || canManageMembers || canDelete) && (
            <>
              <IconButton
                onClick={handleMenuOpen}
                aria-label="more actions"
                aria-controls={menuOpen ? 'tenant-actions-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={menuOpen ? 'true' : undefined}
              >
                <MoreVertIcon />
              </IconButton>
              <Menu
                id="tenant-actions-menu"
                anchorEl={menuAnchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
                MenuListProps={{
                  'aria-labelledby': 'more-actions-button',
                }}
              >
                {canManageSettings && (
                  <MenuItem onClick={handleSettingsClick}>
                    <ListItemIcon>
                      <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Settings</ListItemText>
                  </MenuItem>
                )}
                {canManageMembers && (
                  <MenuItem onClick={handleMembersClick}>
                    <ListItemIcon>
                      <PeopleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Manage Members</ListItemText>
                  </MenuItem>
                )}
                {canDelete && (
                  <MenuItem onClick={handleDeleteClick}>
                    <ListItemIcon>
                      <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>
                      <Typography color="error">Delete Tenant</Typography>
                    </ListItemText>
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
        </Box>
    </Box>
  );
}

