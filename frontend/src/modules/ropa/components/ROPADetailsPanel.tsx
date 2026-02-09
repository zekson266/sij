/**
 * ROPA Details Panel - Shows form/details for selected tree item.
 * 
 * Displays read-only summary for repositories and full details for other item types.
 * Action buttons (Edit/Delete) are handled by the parent toolbar.
 */
import * as React from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  Typography,
  TextField,
  Divider,
  Chip,
  Stack,
  Grid,
  CircularProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Business as BusinessIcon,
  Category as CategoryIcon,
  Description as DescriptionIcon,
  Warning as WarningIcon,
  Public as PublicIcon,
  Policy as PolicyIcon,
  SwapHoriz as SwapHorizIcon,
  Security as SecurityIcon,
  Flag as FlagIcon,
  People as PeopleIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  DeviceHub as DeviceHubIcon,
  Schedule as ScheduleIcon,
  Gavel as GavelIcon,
} from '@mui/icons-material';
import type {
  Repository,
  Activity,
  DataElement,
  DPIA,
  Risk,
  Department,
  Location,
  System,
} from '../services/ropaApi';

interface ROPADetailsPanelProps {
  itemType: 'repository' | 'activity' | 'data_element' | 'dpia' | 'risk';
  data: Repository | Activity | DataElement | DPIA | Risk | null;
  isRefreshing?: boolean;
  departmentById?: Record<string, Department>;
  locationById?: Record<string, Location>;
  systemById?: Record<string, System>;
}

export default function ROPADetailsPanel({
  itemType,
  data,
  isRefreshing = false,
  departmentById = {},
  locationById = {},
  systemById = {},
}: ROPADetailsPanelProps) {
  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          No data available
        </Typography>
      </Box>
    );
  }

  const getIcon = () => {
    switch (itemType) {
      case 'repository':
        return <StorageIcon color="primary" sx={{ fontSize: 32 }} />;
      case 'activity':
        return <BusinessIcon color="primary" sx={{ fontSize: 32 }} />;
      case 'data_element':
        return <CategoryIcon color="primary" sx={{ fontSize: 32 }} />;
      case 'dpia':
        return <DescriptionIcon color="primary" sx={{ fontSize: 32 }} />;
      case 'risk':
        return <WarningIcon color="primary" sx={{ fontSize: 32 }} />;
      default:
        return null;
    }
  };

  const getItemName = (): string => {
    switch (itemType) {
      case 'repository':
        return (data as Repository).data_repository_name;
      case 'activity':
        return (data as Activity).processing_activity_name;
      case 'data_element':
        return (data as DataElement).category || 'Data Element';
      case 'dpia':
        return (data as DPIA).title;
      case 'risk':
        return (data as Risk).title;
      default:
        return 'Details';
    }
  };

  const getItemDescription = (): string | undefined => {
    switch (itemType) {
      case 'repository':
        return (data as Repository).data_repository_description;
      case 'activity':
        return (data as Activity).purpose || undefined;
      case 'data_element':
        return (data as DataElement).category || '';
      case 'dpia':
        return (data as DPIA).description;
      case 'risk':
        return (data as Risk).description;
      default:
        return undefined;
    }
  };

  const emptyValue = 'Not set';

  const renderTextValue = (value?: string | null): string => {
    if (!value) return emptyValue;
    const trimmed = value.trim();
    return trimmed ? trimmed : emptyValue;
  };

  const renderBooleanValue = (value?: boolean | null): string => {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return emptyValue;
  };

  const renderField = (label: string, value: string | ReactNode) => (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      {typeof value === 'string' ? (
        <Typography variant="body1" color={value === emptyValue ? 'text.secondary' : 'text.primary'}>
          {value}
        </Typography>
      ) : (
        value
      )}
    </Box>
  );

  const renderSummaryItem = (icon: ReactNode, label: string, value: string | ReactNode) => (
    <Box display="flex" gap={1.5} alignItems="flex-start">
      <Box sx={{ mt: '2px', color: 'text.secondary', flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        {typeof value === 'string' ? (
          <Typography variant="body2" color={value === emptyValue ? 'text.secondary' : 'text.primary'}>
            {value}
          </Typography>
        ) : (
          value
        )}
      </Box>
    </Box>
  );

  const [openSections, setOpenSections] = React.useState({
    identity: true,
    compliance: false,
    transfers: false,
    geography: false,
    interfaces: false,
    recipients: false,
    timestamps: false,
  });
  const [activitySections, setActivitySections] = React.useState({
    legal: true,
    subjects: false,
    dpia: false,
    children: false,
    operations: false,
    notes: false,
    timestamps: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const toggleActivitySection = (key: keyof typeof activitySections) => {
    setActivitySections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getFlagEmoji = (countryCode?: string): string => {
    if (!countryCode || countryCode.length !== 2) return '';
    const upper = countryCode.toUpperCase();
    const first = 127397 + upper.charCodeAt(0);
    const second = 127397 + upper.charCodeAt(1);
    return String.fromCodePoint(first, second);
  };


  const renderLocationChip = (locationId: string) => {
    const location = locationById[locationId];
    if (!location) {
      return (
        <Chip
          key={locationId}
          label={`Unknown (${locationId.slice(0, 8)})`}
          size="small"
          variant="outlined"
        />
      );
    }
    if (location.type === 'country' && location.country_code) {
      const flag = getFlagEmoji(location.country_code);
      return (
        <Chip
          key={locationId}
          label={`${flag} ${location.name}`}
          size="small"
        />
      );
    }
    return (
      <Chip
        key={locationId}
        icon={<PublicIcon fontSize="small" />}
        label={location.name}
        size="small"
      />
    );
  };

  const renderChipList = (items: string[] | undefined, renderChip: (item: string) => ReactNode) => {
    if (!items || items.length === 0) {
      return (
        <Typography variant="body1" color="text.secondary">
          {emptyValue}
        </Typography>
      );
    }
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {items.map(renderChip)}
      </Stack>
    );
  };

  const getLocationLabel = (locationId: string): string => {
    const location = locationById[locationId];
    if (!location) return `Unknown (${locationId.slice(0, 8)})`;
    if (location.type === 'country' && location.country_code) {
      const flag = getFlagEmoji(location.country_code);
      return `${flag} ${location.name}`.trim();
    }
    return `🌍 ${location.name}`;
  };

  const getDepartmentLabel = (departmentId?: string | null): string => {
    if (!departmentId) return emptyValue;
    const department = departmentById[departmentId];
    if (!department) return `Unknown (${departmentId.slice(0, 8)})`;
    return department.name;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', minHeight: 600, position: 'relative' }}>
      {/* Loading Overlay */}
      {isRefreshing && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <CircularProgress size={40} />
        </Box>
      )}
      <Box sx={{ opacity: isRefreshing ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" alignItems="flex-start" gap={2} mb={1}>
            <Box sx={{ mt: '2px', flexShrink: 0 }}>
              {getIcon()}
            </Box>
            <Typography variant="h5" component="h2">
              {getItemName()}
            </Typography>
          </Box>
          {getItemDescription() && (
            <Typography variant="body2" color="text.secondary">
              {getItemDescription()}
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Repository Summary View */}
        {itemType === 'repository' && (() => {
          const repo = data as Repository;
          const primaryRepoLocationId = repo.geographical_location_ids?.[0];
          const primaryRepoLocation = primaryRepoLocationId
            ? getLocationLabel(primaryRepoLocationId)
            : emptyValue;
          const accessLocationsLabel = repo.access_location_ids?.length ? (
            <Stack spacing={0.25}>
              {repo.access_location_ids.map((locationId) => (
                <Typography key={locationId} variant="body2">
                  {getLocationLabel(locationId)}
                </Typography>
              ))}
            </Stack>
          ) : (
            emptyValue
          );

          return (
            <Stack spacing={3}>
              {/* Summary */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  {renderSummaryItem(<BusinessIcon fontSize="small" />, 'Business owner', getDepartmentLabel(repo.business_owner))}
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  {renderSummaryItem(<CategoryIcon fontSize="small" />, 'Data type', renderTextValue(repo.data_format))}
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  {renderSummaryItem(<PeopleIcon fontSize="small" />, 'Sub-processors', renderTextValue(repo.sub_processors))}
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  {renderSummaryItem(<PolicyIcon fontSize="small" />, 'GDPR compliant', renderBooleanValue(repo.gdpr_compliant))}
                </Grid>
              </Grid>

              {/* Summary: Transfers & Geography */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  {renderSummaryItem(<PublicIcon fontSize="small" />, 'Geographic region', primaryRepoLocation)}
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  {renderSummaryItem(<FlagIcon fontSize="small" />, 'Access countries', accessLocationsLabel)}
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  {renderSummaryItem(
                    <SwapHorizIcon fontSize="small" />,
                    'Transfer mechanism',
                    renderTextValue(repo.transfer_mechanism)
                  )}
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  {renderSummaryItem(
                    <SecurityIcon fontSize="small" />,
                    'Cross-border safeguard',
                    renderTextValue(repo.cross_border_safeguards)
                  )}
                </Grid>
              </Grid>

              <Divider />

              {/* Details sections */}
              <List disablePadding>
                <ListItemButton onClick={() => toggleSection('identity')}>
                  <ListItemIcon>
                    <BusinessIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Identity & ownership" />
                  {openSections.identity ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </ListItemButton>
                <Collapse in={openSections.identity} timeout="auto" unmountOnExit>
                  <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                    <Stack spacing={1.5}>
                      {renderField('Business owner', getDepartmentLabel(repo.business_owner))}
                      {renderField('Vendor', renderTextValue(repo.external_vendor))}
                      {renderField('Sub-processors', renderTextValue(repo.sub_processors))}
                      {renderField('Data type', renderTextValue(repo.data_format))}
                      {renderField('Status', renderTextValue(repo.status))}
                      {renderField('Record count', renderTextValue(repo.record_count?.toString()))}
                    </Stack>
                  </Box>
                </Collapse>
                <Divider />

                <ListItemButton onClick={() => toggleSection('compliance')}>
                  <ListItemIcon>
                    <PolicyIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Compliance" />
                  {openSections.compliance ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </ListItemButton>
                <Collapse in={openSections.compliance} timeout="auto" unmountOnExit>
                  <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                    <Stack spacing={1.5}>
                      {renderField('GDPR compliant', renderBooleanValue(repo.gdpr_compliant))}
                      {renderField('Vendor GDPR compliant', renderBooleanValue(repo.vendor_gdpr_compliance))}
                      {renderField(
                        'Certification',
                        repo.certification && repo.certification !== 'N/A' ? repo.certification : emptyValue
                      )}
                      {renderField('DPA', repo.dpa_url ? 'Provided' : emptyValue)}
                    </Stack>
                  </Box>
                </Collapse>
                <Divider />

                <ListItemButton onClick={() => toggleSection('transfers')}>
                  <ListItemIcon>
                    <SwapHorizIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Cross-border transfers" />
                  {openSections.transfers ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </ListItemButton>
                <Collapse in={openSections.transfers} timeout="auto" unmountOnExit>
                  <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                    <Stack spacing={1.5}>
                      {renderField('Transfer mechanism', renderTextValue(repo.transfer_mechanism))}
                      {renderField('Safeguards', renderTextValue(repo.cross_border_safeguards))}
                      {renderField('Derogation', renderTextValue(repo.derogation_type))}
                      {renderField('Details', renderTextValue(repo.cross_border_transfer_detail))}
                    </Stack>
                  </Box>
                </Collapse>
                <Divider />

                <ListItemButton onClick={() => toggleSection('geography')}>
                  <ListItemIcon>
                    <PublicIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Geography & access" />
                  {openSections.geography ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </ListItemButton>
                <Collapse in={openSections.geography} timeout="auto" unmountOnExit>
                  <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                    <Stack spacing={1.5}>
                      {renderField(
                        'Repository locations',
                        renderChipList(repo.geographical_location_ids, renderLocationChip)
                      )}
                      {renderField(
                        'Access locations',
                        renderChipList(repo.access_location_ids, renderLocationChip)
                      )}
                    </Stack>
                  </Box>
                </Collapse>
                <Divider />

                <ListItemButton onClick={() => toggleSection('interfaces')}>
                  <ListItemIcon>
                    <DeviceHubIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Interfaces" />
                  {openSections.interfaces ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </ListItemButton>
                <Collapse in={openSections.interfaces} timeout="auto" unmountOnExit>
                  <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                    <Stack spacing={1.5}>
                      {renderField('Type', renderTextValue(repo.interface_type))}
                      {renderField(
                        'Interface locations',
                        renderChipList(repo.interface_location_ids, renderLocationChip)
                      )}
                      {renderField(
                        'Systems linked',
                        renderChipList(repo.system_interfaces, (systemId) => {
                          const system = systemById[systemId];
                          if (!system) {
                            return (
                              <Chip
                                key={systemId}
                                label={`Unknown (${systemId.slice(0, 8)})`}
                                size="small"
                                variant="outlined"
                              />
                            );
                          }
                          return <Chip key={systemId} label={system.name} size="small" />;
                        })
                      )}
                    </Stack>
                  </Box>
                </Collapse>
                <Divider />

                <ListItemButton onClick={() => toggleSection('recipients')}>
                  <ListItemIcon>
                    <PeopleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Data recipients" />
                  {openSections.recipients ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </ListItemButton>
                <Collapse in={openSections.recipients} timeout="auto" unmountOnExit>
                  <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                    <Stack spacing={1.5}>
                      {renderField('Recipients', renderTextValue(repo.data_recipients))}
                      {renderField('Sub-processors', renderTextValue(repo.sub_processors))}
                    </Stack>
                  </Box>
                </Collapse>
                <Divider />

                <ListItemButton onClick={() => toggleSection('timestamps')}>
                  <ListItemIcon>
                    <ScheduleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Timestamps" />
                  {openSections.timestamps ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </ListItemButton>
                <Collapse in={openSections.timestamps} timeout="auto" unmountOnExit>
                  <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                    <Stack spacing={1.5}>
                      {renderField('Created', formatDate(repo.created_at))}
                      {renderField('Updated', formatDate(repo.updated_at))}
                    </Stack>
                  </Box>
                </Collapse>
              </List>

            </Stack>
          );
        })()}

        {/* Activity Form */}
        {itemType === 'activity' && (
          (() => {
            const activity = data as Activity;
            const legalJurisdictionLabel = activity.legal_jurisdiction?.length ? (
              <Stack spacing={0.25}>
                {activity.legal_jurisdiction.map((value) => (
                  <Typography key={value} variant="body2">
                    {value}
                  </Typography>
                ))}
              </Stack>
            ) : (
              emptyValue
            );
            const dataSubjectTypeLabel = activity.data_subject_type?.length ? (
              <Stack spacing={0.25}>
                {activity.data_subject_type.map((value) => (
                  <Typography key={value} variant="body2">
                    {value}
                  </Typography>
                ))}
              </Stack>
            ) : (
              emptyValue
            );
            const renderIdChip = (value: string) => (
              <Chip
                key={value}
                label={`Unknown (${value.slice(0, 8)})`}
                size="small"
                variant="outlined"
              />
            );

            return (
              <Stack spacing={3}>
                {/* Summary */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    {renderSummaryItem(<GavelIcon fontSize="small" />, 'Lawful basis', renderTextValue(activity.lawful_basis))}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    {renderSummaryItem(
                      <DescriptionIcon fontSize="small" />,
                      'DPIA required',
                      renderBooleanValue(activity.dpia_required)
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    {renderSummaryItem(<PublicIcon fontSize="small" />, 'Legal jurisdiction', legalJurisdictionLabel)}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    {renderSummaryItem(<PeopleIcon fontSize="small" />, 'Data subject type', dataSubjectTypeLabel)}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    {renderSummaryItem(
                      <DeviceHubIcon fontSize="small" />,
                      'Processing frequency',
                      renderTextValue(activity.processing_frequency)
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    {renderSummaryItem(
                      <PolicyIcon fontSize="small" />,
                      'Automated decision',
                      renderBooleanValue(activity.automated_decision)
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    {renderSummaryItem(
                      <ScheduleIcon fontSize="small" />,
                      'Data retention policy',
                      renderTextValue(activity.data_retention_policy)
                    )}
                  </Grid>
                </Grid>

                <Divider />

                <List disablePadding>
                  <ListItemButton onClick={() => toggleActivitySection('legal')}>
                    <ListItemIcon>
                      <GavelIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Legal basis & consent" />
                    {activitySections.legal ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                  <Collapse in={activitySections.legal} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                      <Stack spacing={1.5}>
                        {renderField('Lawful basis', renderTextValue(activity.lawful_basis))}
                        {renderField('Consent process', renderTextValue(activity.consent_process))}
                        {renderField('JIT notice', renderTextValue(activity.jit_notice))}
                        {renderField('Legitimate interest assessment', renderTextValue(activity.legitimate_interest_assessment))}
                      </Stack>
                    </Box>
                  </Collapse>
                  <Divider />

                  <ListItemButton onClick={() => toggleActivitySection('subjects')}>
                    <ListItemIcon>
                      <PeopleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Data subjects & disclosure" />
                    {activitySections.subjects ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                  <Collapse in={activitySections.subjects} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                      <Stack spacing={1.5}>
                        {renderField('Data subject type', renderChipList(activity.data_subject_type, (value) => (
                          <Chip key={value} label={value} size="small" />
                        )))}
                        {renderField('Data disclosed to', renderChipList(activity.data_disclosed_to, renderIdChip))}
                        {renderField('Collection sources', renderChipList(activity.collection_sources, renderIdChip))}
                      </Stack>
                    </Box>
                  </Collapse>
                  <Divider />

                  <ListItemButton onClick={() => toggleActivitySection('dpia')}>
                    <ListItemIcon>
                      <DescriptionIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="DPIA & safeguards" />
                    {activitySections.dpia ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                  <Collapse in={activitySections.dpia} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                      <Stack spacing={1.5}>
                        {renderField('DPIA required', renderBooleanValue(activity.dpia_required))}
                        {renderField('DPIA comment', renderTextValue(activity.dpia_comment))}
                        {renderField('DPIA file', renderTextValue(activity.dpia_file))}
                        {renderField('DPIA GPC link', renderTextValue(activity.dpia_gpc_link))}
                      </Stack>
                    </Box>
                  </Collapse>
                  <Divider />

                  <ListItemButton onClick={() => toggleActivitySection('children')}>
                    <ListItemIcon>
                      <PeopleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Children’s data" />
                    {activitySections.children ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                  <Collapse in={activitySections.children} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                      <Stack spacing={1.5}>
                        {renderField('Children data', renderTextValue(activity.children_data))}
                        {renderField('Parental consent', renderTextValue(activity.parental_consent))}
                      </Stack>
                    </Box>
                  </Collapse>
                  <Divider />

                  <ListItemButton onClick={() => toggleActivitySection('operations')}>
                    <ListItemIcon>
                      <DeviceHubIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Operations" />
                    {activitySections.operations ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                  <Collapse in={activitySections.operations} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                      <Stack spacing={1.5}>
                        {renderField('Processing frequency', renderTextValue(activity.processing_frequency))}
                        {renderField('Data retention policy', renderTextValue(activity.data_retention_policy))}
                        {renderField(
                          'Legal jurisdiction',
                          renderChipList(activity.legal_jurisdiction, (value) => (
                            <Chip key={value} label={value} size="small" />
                          ))
                        )}
                      </Stack>
                    </Box>
                  </Collapse>
                  <Divider />

                  <ListItemButton onClick={() => toggleActivitySection('notes')}>
                    <ListItemIcon>
                      <CategoryIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Notes" />
                    {activitySections.notes ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                  <Collapse in={activitySections.notes} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                      <Stack spacing={1.5}>
                        {renderField(
                          'Comments',
                          renderChipList(activity.comments, (value) => (
                            <Chip key={value} label={value} size="small" />
                          ))
                        )}
                      </Stack>
                    </Box>
                  </Collapse>
                  <Divider />

                  <ListItemButton onClick={() => toggleActivitySection('timestamps')}>
                    <ListItemIcon>
                      <ScheduleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Timestamps" />
                    {activitySections.timestamps ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                  <Collapse in={activitySections.timestamps} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                      <Stack spacing={1.5}>
                        {renderField('Created', formatDate(activity.created_at))}
                        {renderField('Updated', formatDate(activity.updated_at))}
                      </Stack>
                    </Box>
                  </Collapse>
                </List>
              </Stack>
            );
          })()
        )}

        {/* Data Element Form */}
        {itemType === 'data_element' && (
          <>
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Category"
                value={(data as DataElement).category || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
              <TextField
                label="Created At"
                value={formatDate((data as DataElement).created_at)}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
              <TextField
                label="Updated At"
                value={formatDate((data as DataElement).updated_at)}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Box>
          </>
        )}

        {/* DPIA Form */}
        {itemType === 'dpia' && (
          <>
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Title"
                value={(data as DPIA).title || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
              <TextField
                label="Description"
                value={(data as DPIA).description || ''}
                fullWidth
                multiline
                rows={3}
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Status
                </Typography>
                <Chip
                  label={(data as DPIA).status || 'N/A'}
                  color={
                    (data as DPIA).status === 'completed' ? 'success' :
                    (data as DPIA).status === 'in_progress' ? 'warning' :
                    'default'
                  }
                  size="small"
                />
              </Box>
              <TextField
                label="Created At"
                value={formatDate((data as DPIA).created_at)}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
              <TextField
                label="Updated At"
                value={formatDate((data as DPIA).updated_at)}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Box>
          </>
        )}

        {/* Risk Form */}
        {itemType === 'risk' && (
          <>
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Title"
                value={(data as Risk).title || ''}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
              <TextField
                label="Description"
                value={(data as Risk).description || ''}
                fullWidth
                multiline
                rows={3}
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
              <Box display="flex" gap={2}>
                <Box flex={1}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Severity
                  </Typography>
                  <Chip
                    label={(data as Risk).severity || 'N/A'}
                    color={
                      (data as Risk).severity === 'high' ? 'error' :
                      (data as Risk).severity === 'medium' ? 'warning' :
                      'default'
                    }
                    size="small"
                  />
                </Box>
                <Box flex={1}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Likelihood
                  </Typography>
                  <Chip
                    label={(data as Risk).likelihood || 'N/A'}
                    color={
                      (data as Risk).likelihood === 'likely' ? 'error' :
                      (data as Risk).likelihood === 'possible' ? 'warning' :
                      'default'
                    }
                    size="small"
                  />
                </Box>
              </Box>
              <TextField
                label="Mitigation"
                value={(data as Risk).mitigation || ''}
                fullWidth
                multiline
                rows={3}
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
              <TextField
                label="Created At"
                value={formatDate((data as Risk).created_at)}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
              <TextField
                label="Updated At"
                value={formatDate((data as Risk).updated_at)}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

