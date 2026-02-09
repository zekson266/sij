import * as React from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { styled, alpha } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../../contexts';
import { getTenantById } from '../../services/tenantApi';
import NavigationDrawer from './NavigationDrawer';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
}));

export default function PrimarySearchAppBar() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Build number state
  const [buildNumber, setBuildNumber] = React.useState<string>('');

  // Tenant name state (for branding)
  const [tenantName, setTenantName] = React.useState<string | null>(null);

  // Fetch build number on mount
  React.useEffect(() => {
    fetch('/build-info.json')
      .then(r => r.json())
      .then(data => setBuildNumber(data.buildNumber || ''))
      .catch(() => setBuildNumber(''));
  }, []);

  // Extract tenant ID from URL and fetch tenant name
  React.useEffect(() => {
    // Check if we're on a tenant page (/tenant/:id/...)
    const tenantMatch = location.pathname.match(/^\/tenant\/([^/]+)/);
    const tenantId = tenantMatch ? tenantMatch[1] : null;

    if (tenantId && isAuthenticated) {
      // Only fetch if it looks like a UUID (not a slug for public pages)
      // UUIDs are 36 chars with dashes, slugs are shorter
      const isUUID = tenantId.length === 36 && tenantId.includes('-');
      
      if (isUUID) {
        getTenantById(tenantId)
          .then((tenant) => {
            setTenantName(tenant.name);
          })
          .catch(() => {
            // Silently fail - just show app name
            setTenantName(null);
          });
      } else {
        // It's a slug, not a tenant management page - don't fetch
        setTenantName(null);
      }
    } else if (location.pathname === '/tenants' && isAuthenticated) {
      // Don't clear tenant name when navigating to /tenants
      // User might be redirected back to tenant page, so keep the name to avoid flickering
      // The tenant name will be updated when they navigate to a tenant page or cleared when navigating elsewhere
    } else {
      // Not on a tenant page or /tenants, and not authenticated - clear tenant name
      setTenantName(null);
    }
  }, [location.pathname, isAuthenticated]);

  // Get user display name
  const displayName = user
    ? user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.first_name || user.email
    : 'User';

  // Get branding text
  const brandingText = tenantName 
    ? `${tenantName} | Prooflane.app`
    : 'Prooflane.app';

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Tooltip title={buildNumber ? `Build ${buildNumber}` : brandingText} arrow>
            <Typography
              variant="h6"
              noWrap
              component={RouterLink}
              to={isAuthenticated ? '/tenants' : '/'}
              sx={{ 
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer'
              }}
            >
              {tenantName ? (
                <>
                  {tenantName}
                  <Box 
                    component="span" 
                    sx={{ 
                      opacity: 0.7, 
                      mx: 1,
                      display: { xs: 'none', sm: 'inline' } // Hide separator on very small screens
                    }}
                  >
                    |
                  </Box>
                  <Box 
                    component="span" 
                    sx={{ 
                      opacity: 0.7,
                      display: { xs: 'none', sm: 'inline' } // Hide app name on very small screens
                    }}
                  >
                    Prooflane.app
                  </Box>
                  {/* Mobile: Show abbreviated version */}
                  <Box 
                    component="span" 
                    sx={{ 
                      opacity: 0.7,
                      display: { xs: 'inline', sm: 'none' }
                    }}
                  >
                    {' '}· Prooflane
                  </Box>
                </>
              ) : (
                'Prooflane.app'
              )}
            </Typography>
          </Tooltip>
          {/* Search - Hidden for now as not used */}
          <Box sx={{ display: 'none' }}>
            <Search>
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
              <StyledInputBase
                placeholder="Search…"
                inputProps={{ 'aria-label': 'search' }}
              />
            </Search>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {isAuthenticated ? (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
              <IconButton
                size="large"
                edge="end"
                aria-label="open navigation drawer"
                onClick={handleDrawerOpen}
                color="inherit"
              >
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'secondary.main' }}>
                  {displayName.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              <Button color="inherit" component={RouterLink} to="/login">
                Login
              </Button>
              <Button color="inherit" component={RouterLink} to="/register" variant="outlined">
                Sign Up
              </Button>
            </Box>
          )}
          {/* Mobile: Show avatar button to open drawer */}
          {isAuthenticated && (
            <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                edge="end"
                aria-label="open navigation drawer"
                onClick={handleDrawerOpen}
                color="inherit"
              >
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'secondary.main' }}>
                  {displayName.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <NavigationDrawer 
        open={drawerOpen} 
        onClose={handleDrawerClose}
        onOpen={handleDrawerOpen}
      />
    </Box>
  );
}

