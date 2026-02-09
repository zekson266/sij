import * as React from 'react';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Avatar,
} from '@mui/material';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import HomeIcon from '@mui/icons-material/Home';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from '../../contexts';
import { getTenantById, getTenantBySlug } from '../../services/tenantApi';
import { getUserTenants } from '../../services/authApi';
import { getIdentifierType } from '../../utils/tenantIdentifier';

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
}

const DRAWER_WIDTH = 280;

// iOS detection for SwipeableDrawer optimization
// See: https://mui.com/material-ui/react-drawer/#swipeable
const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

export default function NavigationDrawer({ open, onClose, onOpen }: NavigationDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [currentTenantName, setCurrentTenantName] = React.useState<string | null>(null);
  const [currentTenantRole, setCurrentTenantRole] = React.useState<string | null>(null);
  const [currentTenantPermissions, setCurrentTenantPermissions] = React.useState<string[]>([]);

  const tenantMatch = location.pathname.match(/^\/tenant\/([^/]+)/);
  const tenantIdentifier = tenantMatch ? tenantMatch[1] : null;
  const lastActiveTenantId =
    typeof window !== 'undefined' ? window.localStorage.getItem('lastActiveTenantId') : null;
  const effectiveTenantId = tenantIdentifier || lastActiveTenantId;

  // Get user display name
  const displayName = user
    ? user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.first_name || user.email
    : 'User';

  const handleNavigation = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  React.useEffect(() => {
    if (!isAuthenticated || !effectiveTenantId) {
      setCurrentTenantName(null);
      setCurrentTenantRole(null);
      return;
    }

    let isMounted = true;

    const loadTenantContext = async () => {
      try {
        const identifierType = getIdentifierType(effectiveTenantId);
        const tenant =
          identifierType === 'uuid'
            ? await getTenantById(effectiveTenantId)
            : await getTenantBySlug(effectiveTenantId);
        const userTenants = await getUserTenants();
        const match = userTenants.find((ut) => ut.tenant.id === tenant.id);

        if (isMounted) {
          setCurrentTenantName(tenant.name);
          setCurrentTenantRole(match?.tenant_user.role ?? null);
          setCurrentTenantPermissions(match?.tenant_user.effective_permissions ?? []);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('lastActiveTenantId', tenant.id);
          }
        }
      } catch (error) {
        if (isMounted) {
          setCurrentTenantName(null);
          setCurrentTenantRole(null);
          setCurrentTenantPermissions([]);
        }
      }
    };

    loadTenantContext();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, effectiveTenantId]);

  const canAccessWorkspace = Boolean(effectiveTenantId && currentTenantRole);
  const canAccessRopa = currentTenantPermissions.includes('ropa:read');
  const canManageSettings = currentTenantPermissions.some((permission) =>
    ['tenant:settings', 'tenant:write'].includes(permission)
  );

  // Account items (user actions)
  const accountItems = [
    { text: 'Profile', icon: <PersonIcon />, path: '/profile', onClick: () => handleNavigation('/profile') },
    { text: 'Logout', icon: <LogoutIcon />, onClick: handleLogout },
  ];

  const drawerContent = (
    <Box sx={{ width: DRAWER_WIDTH, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* User Info Header */}
      {isAuthenticated && user && (
        <>
          <Box
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'secondary.main',
                fontSize: '1.5rem',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 500, maxWidth: '100%' }}>
              {displayName}
            </Typography>
            {user.email && (
              <Typography variant="caption" noWrap sx={{ opacity: 0.9, maxWidth: '100%' }}>
                {user.email}
              </Typography>
            )}
          </Box>
          <Divider />
        </>
      )}

      {/* Navigation Section */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {isAuthenticated ? (
          <>
            <List>
              {/* Landing Page */}
              <ListItem disablePadding>
                <ListItemButton
                  selected={location.pathname === '/'}
                  onClick={() => handleNavigation('/')}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: location.pathname === '/' ? 'primary.main' : 'inherit' }}>
                    <HomeIcon />
                  </ListItemIcon>
                  <ListItemText primary="Home" />
                </ListItemButton>
              </ListItem>
              {/* My Tenants */}
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/tenants')}
                  onClick={() => handleNavigation('/tenants')}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: isActive('/tenants') ? 'primary.main' : 'inherit' }}>
                    <BusinessIcon />
                  </ListItemIcon>
                  <ListItemText primary="My Tenants" />
                </ListItemButton>
              </ListItem>
            </List>

            {currentTenantName && (
              <Box sx={{ px: 2, pt: 2 }}>
                <Typography variant="subtitle2" noWrap>
                  {currentTenantName}
                </Typography>
              </Box>
            )}

            {effectiveTenantId && (
              <List>
                {canAccessWorkspace && (
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={isActive(`/tenant/${effectiveTenantId}/workspace`)}
                      onClick={() => handleNavigation(`/tenant/${effectiveTenantId}/workspace`)}
                    >
                      <ListItemIcon>
                        <WorkspacesIcon />
                      </ListItemIcon>
                      <ListItemText primary="Workspace" />
                    </ListItemButton>
                  </ListItem>
                )}
                {canAccessRopa && (
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={isActive(`/tenant/${effectiveTenantId}/ropa`)}
                      onClick={() => handleNavigation(`/tenant/${effectiveTenantId}/ropa`)}
                    >
                      <ListItemIcon>
                        <StorageIcon />
                      </ListItemIcon>
                      <ListItemText primary="ROPA" />
                    </ListItemButton>
                  </ListItem>
                )}
                {canManageSettings && (
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={isActive(`/tenant/${effectiveTenantId}/settings`)}
                      onClick={() => handleNavigation(`/tenant/${effectiveTenantId}/settings`)}
                    >
                      <ListItemIcon>
                        <SettingsIcon />
                      </ListItemIcon>
                      <ListItemText primary="Settings" />
                    </ListItemButton>
                  </ListItem>
                )}
              </List>
            )}

            <Divider sx={{ my: 1 }} />

            {/* Account Section */}
            <List>
              {accountItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton onClick={item.onClick}>
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        ) : (
          <List>
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to="/login" onClick={onClose}>
                <ListItemText primary="Login" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to="/register" onClick={onClose}>
                <ListItemText primary="Sign Up" />
              </ListItemButton>
            </ListItem>
          </List>
        )}
      </Box>
    </Box>
  );

  return (
    <SwipeableDrawer
      anchor="left"
      open={open}
      onClose={onClose}
      onOpen={onOpen || (() => {})}
      disableBackdropTransition={!iOS}
      disableDiscovery={iOS}
      sx={{
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </SwipeableDrawer>
  );
}

