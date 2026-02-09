import * as React from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router';
import { Box, Button, CircularProgress, Alert, Stack, Typography } from '@mui/material';
import { PageLayout } from '../components/layout';
import { useAuth, useNotification } from '../contexts';
import { acceptInvitation, getInvitationByToken } from '../services/tenantInvitationsApi';

interface InvitationDetails {
  invitation_id: string;
  tenant_id: string;
  tenant_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface AcceptedData {
  tenant_id?: string;
  tenant_name?: string;
  role?: string;
}

export default function AcceptInvitationPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = (searchParams.get('token') || '').trim();
  const [invitation, setInvitation] = React.useState<InvitationDetails | null>(null);
  const [acceptedData, setAcceptedData] = React.useState<AcceptedData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchInvitation = React.useCallback(async () => {
    if (!token) {
      setError('Invitation token is missing.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const details = await getInvitationByToken(token);
      setInvitation(details);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Invitation not found or expired.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const handleAccept = React.useCallback(async () => {
    if (!token || accepted || isAccepting) return;

    try {
      setIsAccepting(true);
      const response = await acceptInvitation(token);
      setAccepted(true);
      setAcceptedData(response?.data || null);
      showSuccess(response?.message || 'Invitation accepted successfully.');
    } catch (err: any) {
      const message = err?.message || 'Failed to accept invitation.';
      setError(message);
      showError(message);
    } finally {
      setIsAccepting(false);
    }
  }, [token, accepted, isAccepting, showError, showSuccess]);

  React.useEffect(() => {
    fetchInvitation();
  }, [fetchInvitation]);

  React.useEffect(() => {
    if (isAuthenticated && invitation && !accepted && !isAccepting) {
      handleAccept();
    }
  }, [isAuthenticated, invitation, accepted, isAccepting, handleAccept]);

  const inviteSearch = token ? `?token=${encodeURIComponent(token)}` : '';

  if (authLoading || isLoading) {
    return (
      <PageLayout component="main" maxWidth="xs">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout component="main" maxWidth="xs">
      <Stack spacing={2}>
        <Typography variant="h5">Accept Invitation</Typography>

        {error && <Alert severity="error">{error}</Alert>}

        {invitation && (
          <Alert severity="info">
            You have been invited to join <strong>{invitation.tenant_name}</strong> as a{' '}
            <strong>{invitation.role}</strong>.
          </Alert>
        )}

        {!isAuthenticated && (
          <>
            <Alert severity="warning">
              Please sign in or create an account to accept this invitation.
            </Alert>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                component={RouterLink}
                to={`/login${inviteSearch}`}
              >
                Sign in
              </Button>
              <Button
                variant="outlined"
                component={RouterLink}
                to={`/register${inviteSearch}`}
              >
                Create account
              </Button>
            </Stack>
          </>
        )}

        {isAuthenticated && !accepted && (
          <Button
            variant="contained"
            onClick={handleAccept}
            disabled={isAccepting || !invitation}
          >
            {isAccepting ? 'Accepting...' : 'Accept Invitation'}
          </Button>
        )}

        {accepted && (
          <>
            <Alert severity="success">
              You have joined {acceptedData?.tenant_name || invitation?.tenant_name}.
            </Alert>
            <Button
              variant="contained"
              onClick={() => navigate('/tenants')}
            >
              Go to My Tenants
            </Button>
          </>
        )}
      </Stack>
    </PageLayout>
  );
}
