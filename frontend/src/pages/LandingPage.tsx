import { Box, Typography, Grid, Button, Stack, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { PageLayout } from '../components/layout';

export default function LandingPage() {
  return (
    <PageLayout maxWidth="md">
      <Grid container spacing={6} alignItems="center" sx={{ mb: 8 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h2" component="h1" gutterBottom fontWeight={700}>
            Proof made simple.
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 3 }}>
            Prooflane.app helps small and mid-sized businesses stay compliant and audit-ready —
            without a legal team or complex platforms.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            A simple alternative to spreadsheets and heavy compliance tools, with optional AI
            to draft and check records faster.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="contained" size="large" component={RouterLink} to="/register">
              START FREE
            </Button>
            <Button variant="outlined" size="large" component={RouterLink} to="/login">
              SIGN IN
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
            Free public beta · No credit card
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            ✔ Audit-ready records · ✔ AI assistance · ✔ Multi-user collaboration
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
              overflow: 'hidden',
              aspectRatio: { xs: '4 / 3', md: '16 / 10' },
            }}
          >
            <Box
              component="img"
              src="/image.png"
              alt="Prooflane product preview"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                borderRadius: 1,
              }}
            />
          </Box>
        </Grid>
      </Grid>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'center',
          mb: 6,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Trusted by privacy-conscious teams
        </Typography>
        <Divider orientation="vertical" flexItem />
        <Typography variant="caption" color="text.secondary">
          Built for audit-ready workflows
        </Typography>
        <Divider orientation="vertical" flexItem />
        <Typography variant="caption" color="text.secondary">
          Secure tenant workspaces
        </Typography>
      </Box>

    </PageLayout>
  );
}

