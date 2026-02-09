/**
 * ROPA Organization Panel - Shows organization overview with statistics and data management.
 * 
 * Displays concise statistics and placeholder buttons for import/export functionality.
 */
import * as React from 'react';
import {
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Storage as StorageIcon,
  Category as CategoryIcon,
  Description as DescriptionIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import type { Tenant } from '../../../types';
import {
  listRepositories,
  listActivities,
  listDataElements,
  listDPIAs,
  listRisks,
} from '../services/ropaApi';

interface ROPAStats {
  repositories: number;
  activities: number;
  dataElements: number;
  dpias: number;
  risks: number;
}

interface ROPAOrganizationPanelProps {
  tenant: Tenant;
  tenantId: string;
}

export default function ROPAOrganizationPanel({
  tenant,
  tenantId,
}: ROPAOrganizationPanelProps) {
  const [stats, setStats] = React.useState<ROPAStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = React.useState(true);
  const [statsError, setStatsError] = React.useState<string | null>(null);

  // Fetch statistics on mount
  React.useEffect(() => {
    fetchStats();
  }, [tenantId]);

  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      setStatsError(null);
      
      const repositories = await listRepositories(tenantId);
      let activitiesCount = 0;
      let dataElementsCount = 0;
      let dpiasCount = 0;
      let risksCount = 0;

      for (const repo of repositories) {
        const activities = await listActivities(tenantId, repo.id);
        activitiesCount += activities.length;

        for (const activity of activities) {
          const [dataElements, dpias] = await Promise.all([
            listDataElements(tenantId, activity.id),
            listDPIAs(tenantId, activity.id),
          ]);

          dataElementsCount += dataElements.length;
          dpiasCount += dpias.length;

          for (const dpia of dpias) {
            const risks = await listRisks(tenantId, dpia.id);
            risksCount += risks.length;
          }
        }
      }

      setStats({
        repositories: repositories.length,
        activities: activitiesCount,
        dataElements: dataElementsCount,
        dpias: dpiasCount,
        risks: risksCount,
      });
    } catch (err: any) {
      setStatsError(err?.message || 'Failed to load statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Placeholder handlers for buttons
  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export clicked - to be implemented');
  };

  const handleImport = () => {
    // TODO: Implement import functionality
    console.log('Import clicked - to be implemented');
  };

  // Get organization description from tenant metadata
  const getOrganizationDescription = (): string => {
    const metadata = tenant.tenant_metadata as any;
    const company = metadata?.company || {};
    const industry = company.industry?.trim();
    const sector = company.sector?.trim();
    
    if (industry && sector) {
      return `${industry} | ${sector}`;
    } else if (industry) {
      return industry;
    } else if (sector) {
      return sector;
    }
    return "Records of processing activities overview";
  };

  return (
    <Box sx={{ p: 3, height: '100%', minHeight: 600 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <BusinessIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" component="h2">
            {tenant.name}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {getOrganizationDescription()}
        </Typography>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Statistics Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Statistics
        </Typography>
        {isLoadingStats ? (
          <Box display="flex" justifyContent="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Box>
        ) : statsError ? (
          <Alert severity="error">{statsError}</Alert>
        ) : stats ? (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <StorageIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h4">{stats.repositories}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Repositories
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <BusinessIcon sx={{ fontSize: 32, color: 'secondary.main' }} />
                    <Box>
                      <Typography variant="h4">{stats.activities}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Activities
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CategoryIcon sx={{ fontSize: 32, color: 'info.main' }} />
                    <Box>
                      <Typography variant="h4">{stats.dataElements}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Data Elements
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <DescriptionIcon sx={{ fontSize: 32, color: 'success.main' }} />
                    <Box>
                      <Typography variant="h4">{stats.dpias}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        DPIAs
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <WarningIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                    <Box>
                      <Typography variant="h4">{stats.risks}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Risks
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : null}
      </Box>

      {/* Import/Export Section - Placeholder Buttons */}
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Data Management
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={isLoadingStats}
          >
            Export ROPA Data
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={handleImport}
            disabled={isLoadingStats}
          >
            Import ROPA Data
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Import/Export functionality will be implemented in a future update.
        </Typography>
      </Box>
    </Box>
  );
}
