/**
 * ROPA Page - Full page view for Record of Processing Activities.
 * 
 * Displays tenant name and hierarchical tree view of ROPA structure:
 * Repository → Activity → Data Elements / DPIAs → Risks
 */

import * as React from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box,
  Button,
  Alert,
  Autocomplete,
  Chip,
  CircularProgress,
  ListSubheader,
  Menu,
  MenuItem,
  TextField,
  Typography,
  Paper,
  Grid,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Storage as StorageIcon,
  Business as BusinessIcon,
  Category as CategoryIcon,
  Description as DescriptionIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  UnfoldMore as UnfoldMoreIcon,
  UnfoldLess as UnfoldLessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { PageLayout } from '../../../components/layout';
import { useTenantData } from '../../../pages/tenants/hooks/useTenantData';
import ROPADetailsPanel from '../components/ROPADetailsPanel';
import ROPAOrganizationPanel from '../components/ROPAOrganizationPanel';
import RepositoryFormDialog from '../components/RepositoryFormDialog';
import ActivityFormDialog from '../components/ActivityFormDialog';
import DataElementFormDialog from '../components/DataElementFormDialog';
import DPIAFormDialog from '../components/DPIAFormDialog';
import RiskFormDialog from '../components/RiskFormDialog';
import {
  listRepositories,
  listActivities,
  listDataElements,
  listDPIAs,
  listRisks,
  deleteRepository,
  createRepository,
  createActivity,
  deleteActivity,
  getActivity,
  createDataElement,
  deleteDataElement,
  getDataElement,
  createDPIA,
  deleteDPIA,
  getDPIA,
  createRisk,
  deleteRisk,
  getRisk,
  fetchDepartments,
  fetchLocations,
  fetchSystems,
  type Repository,
  type Activity,
  type DataElement,
  type DPIA,
  type Risk,
  type Department,
  type Location,
  type System,
} from '../services/ropaApi';
import { useNotification } from '../../../contexts';
import type { Tenant } from '../../../types';

// Tree item structure for MUI X Tree View
interface ROPATreeItem {
  id: string;
  label: string;
  children?: ROPATreeItem[];
  type: 'organization' | 'repository' | 'activity' | 'data_element' | 'dpia' | 'risk' | 'add_action';
  data?: Tenant | Repository | Activity | DataElement | DPIA | Risk;
  addActionType?: 'repository' | 'activity' | 'data_element' | 'dpia' | 'risk'; // Type of item to add
  parentId?: string; // ID of parent entity (data_repository_id, activity_id, dpia_id) - not needed for repository
}

// Filter row: one field + selected value ids (all options are id+label)
type FilterFieldKey =
  | 'owner'
  | 'repository.country'
  | 'repository.status'
  | 'repository.data_format'
  | 'repository.transfer_mechanism'
  | 'activity.legal_basis'
  | 'activity.processing_frequency'
  | 'activity.dpia_required'
  | 'activity.automated_decision';
interface FilterRow {
  id: string;
  fieldKey: FilterFieldKey;
  valueIds: string[];
}

const LEGAL_BASIS_OPTIONS: { id: string; name: string }[] = [
  { id: 'consent', name: 'Consent' },
  { id: 'contract', name: 'Contract' },
  { id: 'legal_obligation', name: 'Legal obligation' },
  { id: 'vital_interests', name: 'Vital interests' },
  { id: 'public_task', name: 'Public task' },
  { id: 'legitimate_interests', name: 'Legitimate interests' },
  { id: 'other', name: 'Other' },
];

const REPOSITORY_STATUS_OPTIONS: { id: string; name: string }[] = [
  { id: 'active', name: 'Active' },
  { id: 'archived', name: 'Archived' },
  { id: 'decommissioned', name: 'Decommissioned' },
  { id: 'maintenance', name: 'Maintenance' },
];

const DATA_FORMAT_OPTIONS: { id: string; name: string }[] = [
  { id: 'Electronic', name: 'Electronic' },
  { id: 'Physical', name: 'Physical' },
];

const TRANSFER_MECHANISM_OPTIONS: { id: string; name: string }[] = [
  { id: 'Adequacy', name: 'Adequacy' },
  { id: 'Privacy Shield', name: 'Privacy Shield' },
  { id: 'BCR', name: 'BCR' },
  { id: 'Contract', name: 'Contract' },
  { id: 'Derogation', name: 'Derogation' },
];

const PROCESSING_FREQUENCY_OPTIONS: { id: string; name: string }[] = [
  { id: 'Real-time', name: 'Real-time' },
  { id: 'Daily', name: 'Daily' },
  { id: 'Weekly', name: 'Weekly' },
  { id: 'Monthly', name: 'Monthly' },
  { id: 'Ad-hoc', name: 'Ad-hoc' },
];

const BOOLEAN_OPTIONS: { id: string; name: string }[] = [
  { id: 'true', name: 'Yes' },
  { id: 'false', name: 'No' },
];

/** Filter params for repository and activity fields. */
interface ROPAFilterParams {
  ownerIds: string[];
  countryIds: string[];
  legalBasisIds: string[];
  statusIds: string[];
  dataFormatIds: string[];
  transferMechanismIds: string[];
  processingFrequencyIds: string[];
  dpiaRequiredIds: string[];
  automatedDecisionIds: string[];
}

/** Pure filter: returns tree with only repos/activities matching filter sets. */
function applyROPAFilters(
  treeItems: ROPATreeItem[],
  params: ROPAFilterParams,
  legalBasisOptions: { id: string; name: string }[]
): ROPATreeItem[] {
  const {
    ownerIds,
    countryIds,
    legalBasisIds,
    statusIds,
    dataFormatIds,
    transferMechanismIds,
    processingFrequencyIds,
    dpiaRequiredIds,
    automatedDecisionIds,
  } = params;

  const selectedLegalNames = legalBasisIds
    .map((id) => legalBasisOptions.find((o) => o.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  const matchLawfulBasis = (lawfulBasis?: string | null): boolean => {
    if (!lawfulBasis) return false;
    const normalized = lawfulBasis.trim().toLowerCase();
    return selectedLegalNames.some((n) => n.trim().toLowerCase() === normalized);
  };

  const matchBoolFilter = (value: boolean | undefined | null, selectedIds: string[]): boolean => {
    if (selectedIds.length === 0) return true;
    const asStr = value === true ? 'true' : 'false';
    return selectedIds.includes(asStr);
  };

  function filterRepositoryChildren(children: ROPATreeItem[]): ROPATreeItem[] {
    return children.filter((child) => {
      if (child.type === 'add_action') return true;
      if (child.type === 'activity') {
        const activity = child.data as Activity;
        if (legalBasisIds.length > 0 && !matchLawfulBasis(activity?.lawful_basis)) return false;
        if (
          processingFrequencyIds.length > 0 &&
          (!activity?.processing_frequency || !processingFrequencyIds.includes(activity.processing_frequency))
        )
          return false;
        if (dpiaRequiredIds.length > 0 && !matchBoolFilter(activity?.dpia_required, dpiaRequiredIds))
          return false;
        if (automatedDecisionIds.length > 0 && !matchBoolFilter(activity?.automated_decision, automatedDecisionIds))
          return false;
        return true;
      }
      return true;
    });
  }

  const hasActivityFilter =
    legalBasisIds.length > 0 ||
    processingFrequencyIds.length > 0 ||
    dpiaRequiredIds.length > 0 ||
    automatedDecisionIds.length > 0;

  function filterTree(nodes: ROPATreeItem[]): ROPATreeItem[] {
    return nodes.map((node) => {
      if (node.type === 'organization') {
        const repoChildren = (node.children ?? []).filter((child) => {
          if (child.type !== 'repository') return true;
          const repo = child.data as Repository;
          const ownerOk =
            ownerIds.length === 0 ||
            (repo?.business_owner != null && ownerIds.includes(repo.business_owner));
          const countryOk =
            countryIds.length === 0 ||
            (repo?.geographical_location_ids != null &&
              repo.geographical_location_ids.some((lid) => countryIds.includes(lid)));
          const statusOk =
            statusIds.length === 0 || (repo?.status != null && statusIds.includes(repo.status));
          const dataFormatOk =
            dataFormatIds.length === 0 ||
            (repo?.data_format != null && dataFormatIds.includes(repo.data_format));
          const transferOk =
            transferMechanismIds.length === 0 ||
            (repo?.transfer_mechanism != null && transferMechanismIds.includes(repo.transfer_mechanism));
          return ownerOk && countryOk && statusOk && dataFormatOk && transferOk;
        });
        const withFilteredActivities = repoChildren.map((repoChild) => {
          if (repoChild.type !== 'repository') return repoChild;
          return {
            ...repoChild,
            children: filterRepositoryChildren(repoChild.children ?? []),
          };
        });
        const reposToShow = hasActivityFilter
          ? withFilteredActivities.filter((repoChild) => {
              if (repoChild.type !== 'repository') return true;
              const children = repoChild.children ?? [];
              return children.some((c) => c.type === 'activity');
            })
          : withFilteredActivities;
        return { ...node, children: reposToShow };
      }
      return node;
    });
  }

  const hasAnyFilter =
    ownerIds.length > 0 ||
    countryIds.length > 0 ||
    legalBasisIds.length > 0 ||
    statusIds.length > 0 ||
    dataFormatIds.length > 0 ||
    transferMechanismIds.length > 0 ||
    processingFrequencyIds.length > 0 ||
    dpiaRequiredIds.length > 0 ||
    automatedDecisionIds.length > 0;
  if (!hasAnyFilter || treeItems.length === 0) return treeItems;
  return filterTree(treeItems);
}

export default function ROPAPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const { tenant, canAccessRopa, canEditRopa, isLoading: tenantLoading, error: tenantError } = useTenantData(id);

  const [treeItems, setTreeItems] = React.useState<ROPATreeItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedItem, setSelectedItem] = React.useState<ROPATreeItem | null>(null);
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRepository, setEditingRepository] = React.useState<Repository | null>(null);
  const [activityDialogOpen, setActivityDialogOpen] = React.useState(false);
  const [editingActivity, setEditingActivity] = React.useState<Activity | null>(null);
  const [editingRepositoryId, setEditingRepositoryId] = React.useState<string | null>(null);
  const [dataElementDialogOpen, setDataElementDialogOpen] = React.useState(false);
  const [editingDataElement, setEditingDataElement] = React.useState<DataElement | null>(null);
  const [editingActivityId, setEditingActivityId] = React.useState<string | null>(null);
  const [dpiaDialogOpen, setDpiaDialogOpen] = React.useState(false);
  const [editingDPIA, setEditingDPIA] = React.useState<DPIA | null>(null);
  const [riskDialogOpen, setRiskDialogOpen] = React.useState(false);
  const [editingRisk, setEditingRisk] = React.useState<Risk | null>(null);
  const [editingDPIAId, setEditingDPIAId] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [systems, setSystems] = React.useState<System[]>([]);
  const [filterRows, setFilterRows] = React.useState<FilterRow[]>([]);
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = React.useState<null | HTMLElement>(null);

  const canAccessRopaMemo = React.useMemo(() => canAccessRopa, [canAccessRopa]);
  const canEditRopaMemo = React.useMemo(() => canEditRopa, [canEditRopa]);

  React.useEffect(() => {
    if (!id) return;
    Promise.all([
      fetchDepartments(id).catch(() => []),
      fetchLocations(id).catch(() => []),
      fetchSystems(id).catch(() => []),
    ]).then(([depts, locs, syss]) => {
      setDepartments(depts);
      setLocations(locs);
      setSystems(syss);
    });
  }, [id]);

  const locationById = React.useMemo(
    () => locations.reduce<Record<string, Location>>((acc, location) => {
      acc[location.id] = location;
      return acc;
    }, {}),
    [locations]
  );
  const departmentById = React.useMemo(
    () => departments.reduce<Record<string, Department>>((acc, department) => {
      acc[department.id] = department;
      return acc;
    }, {}),
    [departments]
  );
  const ownerOptions = React.useMemo(
    () => departments.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [departments]
  );
  // Countries and regions (repos use geographical_location_ids which can be either)
  const locationCountryAndRegionOptions = React.useMemo(
    () =>
      locations
        .filter((l) => l.type === 'country' || l.type === 'region')
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [locations]
  );

  // Only show filter options that exist in the current tree data (repos/activities in DB)
  const usedFilterValues = React.useMemo(() => {
    const usedOwnerIds = new Set<string>();
    const usedCountryIds = new Set<string>();
    const usedLegalBasisNamesLower = new Set<string>();
    const usedStatus = new Set<string>();
    const usedDataFormat = new Set<string>();
    const usedTransferMechanism = new Set<string>();
    const usedProcessingFrequency = new Set<string>();
    const usedDpiaRequired = new Set<string>();
    const usedAutomatedDecision = new Set<string>();
    const org = treeItems[0];
    if (org?.type === 'organization' && org.children) {
      for (const repoNode of org.children) {
        if (repoNode.type === 'repository' && repoNode.data) {
          const repo = repoNode.data as Repository;
          if (repo.business_owner) usedOwnerIds.add(repo.business_owner);
          (repo.geographical_location_ids ?? []).forEach((id) => usedCountryIds.add(id));
          if (repo.status) usedStatus.add(repo.status);
          if (repo.data_format) usedDataFormat.add(repo.data_format);
          if (repo.transfer_mechanism) usedTransferMechanism.add(repo.transfer_mechanism);
          for (const child of repoNode.children ?? []) {
            if (child.type === 'activity' && child.data) {
              const activity = child.data as Activity;
              if (activity.lawful_basis) {
                usedLegalBasisNamesLower.add(activity.lawful_basis.trim().toLowerCase());
              }
              if (activity.processing_frequency) usedProcessingFrequency.add(activity.processing_frequency);
              usedDpiaRequired.add(activity.dpia_required === true ? 'true' : 'false');
              usedAutomatedDecision.add(activity.automated_decision === true ? 'true' : 'false');
            }
          }
        }
      }
    }
    return {
      usedOwnerIds,
      usedCountryIds,
      usedLegalBasisNamesLower,
      usedStatus,
      usedDataFormat,
      usedTransferMechanism,
      usedProcessingFrequency,
      usedDpiaRequired,
      usedAutomatedDecision,
    };
  }, [treeItems]);

  const availableOwnerOptions = React.useMemo(
    () => ownerOptions.filter((d) => usedFilterValues.usedOwnerIds.has(d.id)),
    [ownerOptions, usedFilterValues]
  );
  // Show locations that appear in repo data; if none found, show all country/region options so dropdown is never empty
  const availableCountryOptions = React.useMemo(() => {
    const used = locationCountryAndRegionOptions.filter((l) => usedFilterValues.usedCountryIds.has(l.id));
    return used.length > 0 ? used : locationCountryAndRegionOptions;
  }, [locationCountryAndRegionOptions, usedFilterValues]);
  const availableLegalBasisOptions = React.useMemo(
    () =>
      LEGAL_BASIS_OPTIONS.filter((o) =>
        usedFilterValues.usedLegalBasisNamesLower.has(o.name.trim().toLowerCase())
      ),
    [usedFilterValues]
  );
  const availableStatusOptions = React.useMemo(() => {
    const used = REPOSITORY_STATUS_OPTIONS.filter((o) => usedFilterValues.usedStatus.has(o.id));
    return used.length > 0 ? used : REPOSITORY_STATUS_OPTIONS;
  }, [usedFilterValues]);
  const availableDataFormatOptions = React.useMemo(() => {
    const used = DATA_FORMAT_OPTIONS.filter((o) => usedFilterValues.usedDataFormat.has(o.id));
    return used.length > 0 ? used : DATA_FORMAT_OPTIONS;
  }, [usedFilterValues]);
  const availableTransferMechanismOptions = React.useMemo(() => {
    const used = TRANSFER_MECHANISM_OPTIONS.filter((o) => usedFilterValues.usedTransferMechanism.has(o.id));
    return used.length > 0 ? used : TRANSFER_MECHANISM_OPTIONS;
  }, [usedFilterValues]);
  const availableProcessingFrequencyOptions = React.useMemo(() => {
    const used = PROCESSING_FREQUENCY_OPTIONS.filter((o) =>
      usedFilterValues.usedProcessingFrequency.has(o.id)
    );
    return used.length > 0 ? used : PROCESSING_FREQUENCY_OPTIONS;
  }, [usedFilterValues]);
  const availableDpiaRequiredOptions = React.useMemo(() => {
    const used = BOOLEAN_OPTIONS.filter((o) => usedFilterValues.usedDpiaRequired.has(o.id));
    return used.length > 0 ? used : BOOLEAN_OPTIONS;
  }, [usedFilterValues]);
  const availableAutomatedDecisionOptions = React.useMemo(() => {
    const used = BOOLEAN_OPTIONS.filter((o) => usedFilterValues.usedAutomatedDecision.has(o.id));
    return used.length > 0 ? used : BOOLEAN_OPTIONS;
  }, [usedFilterValues]);

  type FilterSectionId = 'repository' | 'activity';
  const FILTER_MENU_SECTIONS: { id: FilterSectionId; label: string }[] = [
    { id: 'repository', label: 'Repository' },
    { id: 'activity', label: 'Activity' },
  ];
  const filterFieldsConfig = React.useMemo(
    () => [
      { key: 'owner' as const, label: 'Owner', section: 'repository' as const, icon: <GroupIcon fontSize="small" />, getOptions: () => availableOwnerOptions },
      { key: 'repository.country' as const, label: 'Country / Region', section: 'repository' as const, icon: <StorageIcon fontSize="small" />, getOptions: () => availableCountryOptions },
      { key: 'repository.status' as const, label: 'Status', section: 'repository' as const, icon: <StorageIcon fontSize="small" />, getOptions: () => availableStatusOptions },
      { key: 'repository.data_format' as const, label: 'Data format', section: 'repository' as const, icon: <StorageIcon fontSize="small" />, getOptions: () => availableDataFormatOptions },
      { key: 'repository.transfer_mechanism' as const, label: 'Transfer mechanism', section: 'repository' as const, icon: <StorageIcon fontSize="small" />, getOptions: () => availableTransferMechanismOptions },
      { key: 'activity.legal_basis' as const, label: 'Legal basis', section: 'activity' as const, icon: <BusinessIcon fontSize="small" />, getOptions: () => availableLegalBasisOptions },
      { key: 'activity.processing_frequency' as const, label: 'Processing frequency', section: 'activity' as const, icon: <BusinessIcon fontSize="small" />, getOptions: () => availableProcessingFrequencyOptions },
      { key: 'activity.dpia_required' as const, label: 'DPIA required', section: 'activity' as const, icon: <WarningIcon fontSize="small" />, getOptions: () => availableDpiaRequiredOptions },
      { key: 'activity.automated_decision' as const, label: 'Automated decision', section: 'activity' as const, icon: <BusinessIcon fontSize="small" />, getOptions: () => availableAutomatedDecisionOptions },
    ],
    [
      availableOwnerOptions,
      availableCountryOptions,
      availableStatusOptions,
      availableDataFormatOptions,
      availableTransferMechanismOptions,
      availableLegalBasisOptions,
      availableProcessingFrequencyOptions,
      availableDpiaRequiredOptions,
      availableAutomatedDecisionOptions,
    ]
  );
  const handleAddFilterWithField = React.useCallback((fieldKey: FilterFieldKey) => {
    setFilterRows((prev) => [
      ...prev,
      { id: `filter-${Date.now()}-${Math.random().toString(36).slice(2)}`, fieldKey, valueIds: [] },
    ]);
    setFilterMenuAnchorEl(null);
  }, []);
  const handleRemoveFilterRow = React.useCallback((rowId: string) => {
    setFilterRows((prev) => prev.filter((r) => r.id !== rowId));
  }, []);
  const handleFilterRowValuesChange = React.useCallback((rowId: string, valueIds: string[]) => {
    setFilterRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, valueIds } : r)));
  }, []);

  const filteredTreeItems = React.useMemo(() => {
    const collect = (key: FilterFieldKey) =>
      [...new Set(filterRows.filter((r) => r.fieldKey === key && r.valueIds.length > 0).flatMap((r) => r.valueIds))];
    const params: ROPAFilterParams = {
      ownerIds: collect('owner'),
      countryIds: collect('repository.country'),
      legalBasisIds: collect('activity.legal_basis'),
      statusIds: collect('repository.status'),
      dataFormatIds: collect('repository.data_format'),
      transferMechanismIds: collect('repository.transfer_mechanism'),
      processingFrequencyIds: collect('activity.processing_frequency'),
      dpiaRequiredIds: collect('activity.dpia_required'),
      automatedDecisionIds: collect('activity.automated_decision'),
    };
    return applyROPAFilters(treeItems, params, LEGAL_BASIS_OPTIONS);
  }, [treeItems, filterRows]);

  const systemById = React.useMemo(
    () => systems.reduce<Record<string, System>>((acc, system) => {
      acc[system.id] = system;
      return acc;
    }, {}),
    [systems]
  );

  // Refactored fetch function to avoid duplication
  // skipLoading: if true, don't set isLoading state (for background refreshes)
  const fetchROPAData = React.useCallback(async (skipLoading = false): Promise<ROPATreeItem[]> => {
    if (!id || !tenant || !canAccessRopaMemo) {
      setIsLoading(false);
      return [];
    }

    try {
      // Only set loading state for initial loads, not background refreshes
      if (!skipLoading) {
        setIsLoading(true);
      }
      setError(null);

      const repositories = await listRepositories(id);

      const items: ROPATreeItem[] = await Promise.all(
        repositories.map(async (repo) => {
          const activities = await listActivities(id, repo.id);

          const activityItems: ROPATreeItem[] = await Promise.all(
            activities.map(async (activity) => {
              const [dataElements, dpias] = await Promise.all([
                listDataElements(id, activity.id),
                listDPIAs(id, activity.id),
              ]);

              const dataElementItems: ROPATreeItem[] = dataElements.map((element) => ({
                id: `data-element-${element.id}`,
                label: element.category || 'Data Element',
                type: 'data_element' as const,
                data: element,
              }));

              const dpiaItems: ROPATreeItem[] = await Promise.all(
                dpias.map(async (dpia) => {
                  const risks = await listRisks(id, dpia.id);
                  const riskItems: ROPATreeItem[] = risks.map((risk) => ({
                    id: `risk-${risk.id}`,
                    label: risk.title,
                    type: 'risk' as const,
                    data: risk,
                  }));

                  // Add "Add Risk" action as last child
                  const childrenWithAdd: ROPATreeItem[] = [
                    ...riskItems,
                    ...(canEditRopaMemo
                      ? [
                          {
                            id: `add-risk-${dpia.id}`,
                            label: 'Add Risk',
                            type: 'add_action' as const,
                            addActionType: 'risk' as const,
                            parentId: dpia.id,
                          },
                        ]
                      : []),
                  ];

                  return {
                    id: `dpia-${dpia.id}`,
                    label: `${dpia.title} (${dpia.status})`,
                    type: 'dpia' as const,
                    data: dpia,
                    children: childrenWithAdd,
                  };
                })
              );

              // Add "Add Data Element" and "Add DPIA" actions as last children
              const childrenWithAdd: ROPATreeItem[] = [
                ...dataElementItems,
                ...(canEditRopaMemo
                  ? [
                      {
                        id: `add-data-element-${activity.id}`,
                        label: 'Add Data Element',
                        type: 'add_action' as const,
                        addActionType: 'data_element' as const,
                        parentId: activity.id,
                      },
                    ]
                  : []),
                ...dpiaItems,
                ...(canEditRopaMemo
                  ? [
                      {
                        id: `add-dpia-${activity.id}`,
                        label: 'Add DPIA',
                        type: 'add_action' as const,
                        addActionType: 'dpia' as const,
                        parentId: activity.id,
                      },
                    ]
                  : []),
              ];

              return {
                id: `activity-${activity.id}`,
                label: activity.processing_activity_name,
                type: 'activity' as const,
                data: activity,
                children: childrenWithAdd,
              };
            })
          );

          // Add "Add Activity" action as last child
          const repositoryChildren: ROPATreeItem[] = [
            ...activityItems,
            ...(canEditRopaMemo
              ? [
                  {
                    id: `add-activity-${repo.id}`,
                    label: 'Add Activity',
                    type: 'add_action' as const,
                    addActionType: 'activity' as const,
                    parentId: repo.id,
                  },
                ]
              : []),
          ];

          return {
            id: `repository-${repo.id}`,
            label: repo.data_repository_name,
            type: 'repository' as const,
            data: repo,
            children: repositoryChildren,
          };
        })
      );

      // Add "Add Repository" action as child of organization (not root level)
      const repositoryItemsWithAdd: ROPATreeItem[] = [
        ...items,
        ...(canEditRopaMemo
          ? [
              {
                id: 'add-repository',
                label: 'Add Repository',
                type: 'add_action' as const,
                addActionType: 'repository' as const,
                // No parentId since it's under organization
              },
            ]
          : []),
      ];

      // Wrap in organization root
      const organizationItem: ROPATreeItem = {
        id: `organization-${tenant.id}`,
        label: tenant.name,
        type: 'organization' as const,
        data: tenant,
        children: repositoryItemsWithAdd,
      };

      const treeItems = [organizationItem];
      setTreeItems(treeItems);
      
      // Auto-expand organization node only on initial load (not on refresh)
      if (!skipLoading && treeItems.length > 0 && treeItems[0].type === 'organization') {
        setExpandedItems([treeItems[0].id]);
      }
      
      return treeItems;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load ROPA data';
      setError(errorMessage);
      showError(errorMessage);
      return [];
    } finally {
      // Only clear loading state if we set it
      if (!skipLoading) {
        setIsLoading(false);
      }
    }
  }, [id, tenant?.id, canAccessRopaMemo, canEditRopaMemo, showError]);

  // Get icon for tree item type
  const getIconForType = React.useCallback((type: ROPATreeItem['type']) => {
    switch (type) {
      case 'organization':
        return <BusinessIcon fontSize="small" color="primary" />;
      case 'repository':
        return <StorageIcon fontSize="small" color="primary" />;
      case 'activity':
        return <BusinessIcon fontSize="small" color="action" />;
      case 'data_element':
        return <CategoryIcon fontSize="small" color="secondary" />;
      case 'dpia':
        return <DescriptionIcon fontSize="small" color="info" />;
      case 'risk':
        return <WarningIcon fontSize="small" color="warning" />;
      case 'add_action':
        return <AddIcon fontSize="small" color="primary" />;
      default:
        return null;
    }
  }, []);

  // Find item in tree by ID (recursive)
  const findItemInTree = React.useCallback((items: ROPATreeItem[], itemId: string): ROPATreeItem | null => {
    for (const item of items) {
      if (item.id === itemId) {
        return item;
      }
      if (item.children) {
        const found = findItemInTree(item.children, itemId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Get all parent IDs from root to the specified item (excludes the item itself)
  const getParentIds = React.useCallback((itemId: string, items: ROPATreeItem[]): string[] => {
    const findPath = (items: ROPATreeItem[], targetId: string, path: string[] = []): string[] | null => {
      for (const item of items) {
        const currentPath = [...path, item.id];
        if (item.id === targetId) {
          return currentPath.slice(0, -1); // Return parents (exclude self)
        }
        if (item.children) {
          const found = findPath(item.children, targetId, currentPath);
          if (found) return found;
        }
      }
      return null;
    };
    return findPath(items, itemId) || [];
  }, []);

  // Get all expandable item IDs (items with children)
  const getAllExpandableIds = React.useCallback((items: ROPATreeItem[]): string[] => {
    const ids: string[] = [];
    const traverse = (items: ROPATreeItem[]) => {
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          ids.push(item.id);
          traverse(item.children);
        }
      });
    };
    traverse(items);
    return ids;
  }, []);


  // Toggle expand/collapse all (uses filtered tree so only visible nodes are expanded)
  const handleToggleExpandAll = React.useCallback(() => {
    const allIds = getAllExpandableIds(filteredTreeItems);
    if (expandedItems.length === allIds.length && allIds.length > 0) {
      setExpandedItems([]); // Collapse all
    } else {
      setExpandedItems(allIds); // Expand all
    }
  }, [filteredTreeItems, expandedItems, getAllExpandableIds]);

  // Handle tree item selection
  const handleItemClick = (_event: React.SyntheticEvent, itemId: string) => {
    const item = findItemInTree(treeItems, itemId);
    if (!item) return;

    // Handle organization selection - show dashboard panel
    if (item.type === 'organization') {
      setSelectedItem(item);
      return; // Don't proceed to other handlers
    }

    // Handle "Add New..." actions - create entity first, then open in edit mode
    if (item.type === 'add_action' && item.addActionType) {
      // Repository doesn't need parentId (it's at root level)
      if (item.addActionType === 'repository') {
        handleCreateRepository();
        return;
      }
      
      // Other types need parentId
      if (item.parentId) {
        switch (item.addActionType) {
          case 'activity':
            handleCreateActivity(item.parentId);
            return;
          case 'data_element':
            handleCreateDataElement(item.parentId);
            return;
          case 'dpia':
            handleCreateDPIA(item.parentId);
            return;
          case 'risk':
            handleCreateRisk(item.parentId);
            return;
        }
      }
    }

    // Normal item selection - show in details panel
    setSelectedItem(item);
  };

  // Handle create repository - create default repo first, then open in edit mode
  const handleCreateRepository = async () => {
    if (!id) return;
    
    try {
      // Create default repository in background
      const defaultRepo = await createRepository(id, {
        name: "", // Empty name triggers default "Repository 1" on backend
        status: "active",
      } as any);
      
      // Open form in edit mode with the new repository
      setEditingRepository(defaultRepo);
      setDialogOpen(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to create repository');
    }
  };

  // Handle create activity - create default activity first, then open in edit mode
  const handleCreateActivity = async (repositoryId: string) => {
    if (!id) return;
    
    try {
      // Create default activity in background
      const defaultActivity = await createActivity(id, repositoryId, {
        data_repository_id: repositoryId,
        processing_activity_name: "", // Empty name - user will fill in form
      } as any);
      
      // Open form in edit mode with the new activity
      setEditingActivity(defaultActivity);
      setEditingRepositoryId(repositoryId);
      setActivityDialogOpen(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to create activity');
    }
  };

  // Handle create data element - create default data element first, then open in edit mode
  const handleCreateDataElement = async (activityId: string) => {
    if (!id) return;
    
    try {
      // Create default data element in background
      const defaultDataElement = await createDataElement(id, activityId, {
        processing_activity_id: activityId,
      });
      
      // Open form in edit mode with the new data element
      setEditingDataElement(defaultDataElement);
      setEditingActivityId(activityId);
      setDataElementDialogOpen(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to create data element');
    }
  };

  // Handle create DPIA - create default DPIA first, then open in edit mode
  const handleCreateDPIA = async (activityId: string) => {
    if (!id) return;
    
    try {
      // Create default DPIA in background
      const defaultDPIA = await createDPIA(id, activityId, {
        processing_activity_id: activityId,
        title: "", // Empty title - user will fill in form
        status: "draft",
      } as any);
      
      // Open form in edit mode with the new DPIA
      setEditingDPIA(defaultDPIA);
      setEditingActivityId(activityId);
      setDpiaDialogOpen(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to create DPIA');
    }
  };

  // Handle create risk - create default risk first, then open in edit mode
  const handleCreateRisk = async (dpiaId: string) => {
    if (!id) return;
    
    try {
      // Create default risk in background
      const defaultRisk = await createRisk(id, dpiaId, {
        dpia_id: dpiaId,
        title: "", // Empty title - user will fill in form
      } as any);
      
      // Open form in edit mode with the new risk
      setEditingRisk(defaultRisk);
      setEditingDPIAId(dpiaId);
      setRiskDialogOpen(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to create risk');
    }
  };

  // Handle edit repository - refetch latest data to ensure we have current values
  const handleEditRepository = async (repo: Repository) => {
    if (!id) return;
    try {
      // Refetch the repository to get the latest data
      const { getRepository } = await import('../services/ropaApi');
      const latestRepo = await getRepository(id, repo.id);
      setEditingRepository(latestRepo);
      setDialogOpen(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to load repository data');
      // Fallback to using the provided repo if fetch fails
      setEditingRepository(repo);
      setDialogOpen(true);
    }
  };

  // Handle delete repository
  const handleDeleteRepository = async (repo: Repository) => {
    if (!window.confirm(`Are you sure you want to delete "${repo.data_repository_name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteRepository(id!, repo.id);
      showSuccess('Repository deleted successfully');
      // Clear selection if deleted item was selected
      if (selectedItem?.id === `repository-${repo.id}`) {
        setSelectedItem(null);
      }
      // Refresh tree (skip loading state to avoid full-page spinner)
      fetchROPAData(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to delete repository');
    }
  };

  // Handle edit activity - refetch latest data to ensure we have current values
  const handleEditActivity = async (activity: Activity) => {
    if (!id) return;
    try {
      // Find the repository ID from the tree
      const repoId = findRepositoryIdForActivity(treeItems, activity.id);
      if (!repoId) {
        showError('Could not find repository for this activity');
        return;
      }
      
      // Refetch the activity to get the latest data
      const latestActivity = await getActivity(id, activity.id);
      setEditingActivity(latestActivity);
      setEditingRepositoryId(repoId);
      setActivityDialogOpen(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to load activity data');
      // Fallback to using the provided activity if fetch fails
      const repoId = findRepositoryIdForActivity(treeItems, activity.id);
      if (repoId) {
        setEditingActivity(activity);
        setEditingRepositoryId(repoId);
        setActivityDialogOpen(true);
      }
    }
  };

  // Handle delete activity
  const handleDeleteActivity = async (activity: Activity) => {
    if (!window.confirm(`Are you sure you want to delete "${activity.processing_activity_name}"? This action cannot be undone.`)) {
      return;
    }
    if (!id) return;
    try {
      await deleteActivity(id, activity.id);
      showSuccess('Activity deleted successfully');
      // Clear selection if deleted item was selected
      if (selectedItem?.id === `activity-${activity.id}`) {
        setSelectedItem(null);
      }
      // Refresh tree (skip loading state to avoid full-page spinner)
      fetchROPAData(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to delete activity');
    }
  };

  // Helper function to find repository ID for an activity
  const findRepositoryIdForActivity = (items: ROPATreeItem[], activityId: string): string | null => {
    // Handle new structure: Organization → Repository → Activity
    for (const item of items) {
      // If root is organization, look in its children for repositories
      if (item.type === 'organization' && item.children) {
        for (const repo of item.children) {
          if (repo.type === 'repository' && repo.children) {
            for (const activity of repo.children) {
              if (activity.type === 'activity' && activity.data?.id === activityId) {
                return (repo.data as Repository)?.id || null;
              }
            }
          }
        }
      }
      // Also handle old structure (if repositories are at root level) for backward compatibility
      else if (item.type === 'repository' && item.children) {
        for (const activity of item.children) {
          if (activity.type === 'activity' && activity.data?.id === activityId) {
            return (item.data as Repository)?.id || null;
          }
        }
      }
    }
    return null;
  };

  // Handle edit data element
  const handleEditDataElement = async (dataElement: DataElement) => {
    if (!id) return;
    try {
      const latestDataElement = await getDataElement(id, dataElement.id);
      setEditingDataElement(latestDataElement);
      setEditingActivityId(latestDataElement.processing_activity_id);
      setDataElementDialogOpen(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to load data element data');
      setEditingDataElement(dataElement);
      setEditingActivityId(dataElement.processing_activity_id);
      setDataElementDialogOpen(true);
    }
  };

  // Handle delete data element
  const handleDeleteDataElement = async (dataElement: DataElement) => {
    if (!window.confirm(`Are you sure you want to delete this data element? This action cannot be undone.`)) {
      return;
    }
    if (!id) return;
    try {
      await deleteDataElement(id, dataElement.id);
      showSuccess('Data Element deleted successfully');
      if (selectedItem?.id === `data-element-${dataElement.id}`) {
        setSelectedItem(null);
      }
      fetchROPAData(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to delete data element');
    }
  };

  // Handle edit DPIA
  const handleEditDPIA = async (dpia: DPIA) => {
    if (!id) return;
    try {
      const latestDPIA = await getDPIA(id, dpia.id);
      setEditingDPIA(latestDPIA);
      setEditingActivityId(latestDPIA.processing_activity_id);
      setDpiaDialogOpen(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to load DPIA data');
      setEditingDPIA(dpia);
      setEditingActivityId(dpia.processing_activity_id);
      setDpiaDialogOpen(true);
    }
  };

  // Handle delete DPIA
  const handleDeleteDPIA = async (dpia: DPIA) => {
    if (!window.confirm(`Are you sure you want to delete "${dpia.title}"? This action cannot be undone.`)) {
      return;
    }
    if (!id) return;
    try {
      await deleteDPIA(id, dpia.id);
      showSuccess('DPIA deleted successfully');
      if (selectedItem?.id === `dpia-${dpia.id}`) {
        setSelectedItem(null);
      }
      fetchROPAData(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to delete DPIA');
    }
  };

  // Handle edit risk
  const handleEditRisk = async (risk: Risk) => {
    if (!id) return;
    try {
      const latestRisk = await getRisk(id, risk.id);
      setEditingRisk(latestRisk);
      setEditingDPIAId(latestRisk.dpia_id);
      setRiskDialogOpen(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to load risk data');
      setEditingRisk(risk);
      setEditingDPIAId(risk.dpia_id);
      setRiskDialogOpen(true);
    }
  };

  // Handle delete risk
  const handleDeleteRisk = async (risk: Risk) => {
    if (!window.confirm(`Are you sure you want to delete "${risk.title}"? This action cannot be undone.`)) {
      return;
    }
    if (!id) return;
    try {
      await deleteRisk(id, risk.id);
      showSuccess('Risk deleted successfully');
      if (selectedItem?.id === `risk-${risk.id}`) {
        setSelectedItem(null);
      }
      fetchROPAData(true);
    } catch (err: any) {
      showError(err?.message || 'Failed to delete risk');
    }
  };

  // Handle dialog success
  const handleDialogSuccess = async () => {
    // Store the selected item ID and editing repository ID before refresh
    const selectedItemId = selectedItem?.id;
    const editingRepoId = editingRepository?.id;
    
    // Preserve current expansion state before refresh
    const currentExpanded = expandedItems;
    
    // Set refreshing state to show spinner in details panel
    setIsRefreshing(true);
    
    try {
      // Refresh tree data and get the new items (skip loading state to avoid full-page spinner)
      const newItems = await fetchROPAData(true);
      
      // Filter expansion state to only IDs that still exist in the new tree
      const validExpanded = currentExpanded.filter(id => 
        findItemInTree(newItems, id) !== null
      );
      
      // Get parent IDs of selected item to ensure it's visible
      const parentIds = selectedItemId 
        ? getParentIds(selectedItemId, newItems)
        : [];
      
      // Merge: valid expanded IDs + parent IDs of selected item
      const newExpandedItems = [...new Set([...validExpanded, ...parentIds])];
      setExpandedItems(newExpandedItems);
      
      // Update selectedItem if it exists, to reflect any changes
      if (selectedItemId) {
        const updatedItem = findItemInTree(newItems, selectedItemId);
        if (updatedItem) {
          setSelectedItem(updatedItem);
          
          // Also update editingRepository if it matches the selected item
          if (editingRepoId && updatedItem.type === 'repository' && updatedItem.data) {
            const repoData = updatedItem.data as Repository;
            if (repoData.id === editingRepoId) {
              setEditingRepository(repoData);
            }
          }
        }
      }
    } finally {
      // Always clear refreshing state, even if there's an error
      setIsRefreshing(false);
    }
  };

  // Fetch ROPA data and build tree structure
  React.useEffect(() => {
    fetchROPAData();
  }, [fetchROPAData]);

  // Loading state
  if (tenantLoading || isLoading) {
    return (
      <PageLayout maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  // Error state
  if (tenantError || !tenant) {
    return (
      <PageLayout maxWidth="lg">
        <Alert severity="error" sx={{ mb: 2 }}>
          {tenantError || 'Tenant not found'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/tenants')}
          variant="contained"
        >
          Back to Tenants
        </Button>
      </PageLayout>
    );
  }

  // Permission check
  if (!canAccessRopa) {
    return (
      <PageLayout maxWidth="lg">
        <Alert severity="error" sx={{ mb: 2 }}>
          You don't have permission to access ROPA.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/tenant/${id}/workspace`)}
          variant="contained"
        >
          Back to Dashboard
        </Button>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="lg">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <StorageIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Record of Processing Activities
          </Typography>
        </Box>
      </Box>

      {/* Split View: Tree + Details Panel */}
      <Paper elevation={0} sx={{ p: 0, overflow: 'hidden', borderRadius: 2 }}>
        {/* Filter panel - full width, chips only */}
        <Box sx={{ px: 3, py: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {filterRows.map((row) => {
              const config = filterFieldsConfig.find((c) => c.key === row.fieldKey);
              const options: { id: string; name: string }[] = (config?.getOptions() ?? []) as { id: string; name: string }[];
              const value = options.filter((opt) => row.valueIds.includes(opt.id));
              return (
                <Chip
                  key={row.id}
                  variant="outlined"
                  size="small"
                  onDelete={() => handleRemoveFilterRow(row.id)}
                  label={
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      {config?.icon ?? null}
                      <Autocomplete
                        multiple
                        size="small"
                        options={options}
                        value={value}
                        onChange={(_event, newValue) =>
                          handleFilterRowValuesChange(row.id, (newValue ?? []).map((o) => o.id))
                        }
                        getOptionLabel={(option) => option.name}
                        renderTags={(tagsValue, getTagProps) =>
                          tagsValue.map((option, index) => (
                            <Chip
                              size="small"
                              label={option.name}
                              {...getTagProps({ index })}
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder={config?.label ?? 'Value'}
                            inputProps={{ ...params.inputProps, 'aria-label': `${config?.label ?? 'Filter'} value` }}
                            variant="standard"
                            InputProps={{ ...params.InputProps, disableUnderline: true }}
                          />
                        )}
                        sx={{ minWidth: 200 }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Box>
                  }
                  sx={{ height: 'auto', py: 0, '& .MuiChip-label': { px: 1, py: 0 } }}
                />
              );
            })}
          </Stack>
        </Box>

        {/* Toolbar - Same Grid structure as content for alignment */}
        <Box sx={{ px: 3, py: 1.5 }}>
          <Grid container spacing={0}>
            {/* Left: Tree Actions */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {filteredTreeItems.length > 0 && (
                  <Tooltip title={expandedItems.length > 0 ? 'Collapse All' : 'Expand All'}>
                    <IconButton size="small" onClick={handleToggleExpandAll}>
                      {expandedItems.length > 0 ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Add filter">
                  <IconButton
                    size="small"
                    onClick={(e) => setFilterMenuAnchorEl(e.currentTarget)}
                    aria-controls={filterMenuAnchorEl ? 'filter-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={filterMenuAnchorEl ? 'true' : undefined}
                  >
                    <FilterListIcon />
                  </IconButton>
                </Tooltip>
                <Menu
                  id="filter-menu"
                  anchorEl={filterMenuAnchorEl}
                  open={Boolean(filterMenuAnchorEl)}
                  onClose={() => setFilterMenuAnchorEl(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  slotProps={{ list: { subheader: <li /> } }}
                >
                  {FILTER_MENU_SECTIONS.map((section) => (
                    <React.Fragment key={section.id}>
                      <ListSubheader sx={{ bgcolor: 'background.default', lineHeight: 2 }}>
                        {section.label}
                      </ListSubheader>
                      {filterFieldsConfig
                        .filter((c) => c.section === section.id)
                        .map((c) => (
                          <MenuItem key={c.key} onClick={() => handleAddFilterWithField(c.key)}>
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                              {c.icon}
                              <span>{c.label}</span>
                            </Box>
                          </MenuItem>
                        ))}
                    </React.Fragment>
                  ))}
                </Menu>
              </Stack>
            </Grid>
            {/* Right: Panel Actions - Aligned with panel below */}
            <Grid size={{ xs: 12, md: 7 }} sx={{ pl: 3 }}>
              {selectedItem &&
               selectedItem.type !== 'add_action' &&
               selectedItem.type !== 'organization' &&
               canEditRopa && (
                <Stack direction="row" spacing={1} justifyContent="flex-start">
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => {
                      if (selectedItem.type === 'repository') {
                        handleEditRepository(selectedItem.data as Repository);
                      } else if (selectedItem.type === 'activity') {
                        handleEditActivity(selectedItem.data as Activity);
                      } else if (selectedItem.type === 'data_element') {
                        handleEditDataElement(selectedItem.data as DataElement);
                      } else if (selectedItem.type === 'dpia') {
                        handleEditDPIA(selectedItem.data as DPIA);
                      } else if (selectedItem.type === 'risk') {
                        handleEditRisk(selectedItem.data as Risk);
                      }
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      if (selectedItem.type === 'repository') {
                        handleDeleteRepository(selectedItem.data as Repository);
                      } else if (selectedItem.type === 'activity') {
                        handleDeleteActivity(selectedItem.data as Activity);
                      } else if (selectedItem.type === 'data_element') {
                        handleDeleteDataElement(selectedItem.data as DataElement);
                      } else if (selectedItem.type === 'dpia') {
                        handleDeleteDPIA(selectedItem.data as DPIA);
                      } else if (selectedItem.type === 'risk') {
                        handleDeleteRisk(selectedItem.data as Risk);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </Stack>
              )}
            </Grid>
          </Grid>
        </Box>

        {/* Content - Same Grid structure as toolbar */}
        <Grid container spacing={0}>
          {/* Left: Tree View */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ p: 2, height: '100%', minHeight: 600 }}>
            {filteredTreeItems.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  {treeItems.length === 0
                    ? 'No repositories found'
                    : 'No items match the current filters'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {treeItems.length === 0
                    ? 'Start by creating your first data repository'
                    : 'Try changing or removing filter chips'}
                </Typography>
              </Box>
            ) : (
              <RichTreeView
                  items={filteredTreeItems}
                  expandedItems={expandedItems}
                  onExpandedItemsChange={(_event, itemIds) => setExpandedItems(itemIds)}
                  onItemClick={handleItemClick}
                  expansionTrigger="iconContainer"
                sx={{
                  minHeight: 400,
                  '& .MuiTreeItem-content': {
                    alignItems: 'flex-start',
                  },
                  '& .MuiTreeItem-iconContainer': {
                    alignItems: 'flex-start',
                    paddingTop: '2px', // Small adjustment to align with text baseline
                  },
                }}
                slotProps={{
                  item: (ownerState) => {
                    const item = findItemInTree(treeItems, ownerState.itemId);
                    const icon = item ? getIconForType(item.type) : null;
                    const isAddAction = item?.type === 'add_action';
                    
                    return {
                      label: (
                        <Box
                          component="span"
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1,
                            width: '100%',
                            ...(isAddAction && {
                              fontStyle: 'italic',
                              color: 'text.disabled',
                              '&:hover': {
                                color: 'text.secondary',
                              },
                            }),
                          }}
                        >
                          {icon && (
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', minWidth: 24 }}>
                              {icon}
                            </Box>
                          )}
                          <span>{ownerState.label}</span>
                        </Box>
                      ),
                    };
                  },
                }}
                />
            )}
            </Box>
          </Grid>

          {/* Right: Details Panel */}
          <Grid size={{ xs: 12, md: 7 }}>
            {/* Outer container - p: 2 to match tree and filter/toolbar density */}
            <Box sx={{ p: 2, height: '100%', minHeight: 600 }}>
              {/* Inner rounded container with background */}
              <Box sx={{ 
                p: 0, 
                height: '100%', 
                minHeight: 600,
                borderRadius: 2,
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                overflow: 'hidden'
              }}>
          {selectedItem && selectedItem.type === 'organization' ? (
            <ROPAOrganizationPanel
              tenant={selectedItem.data as Tenant}
              tenantId={id!}
            />
          ) : selectedItem && 
            selectedItem.type !== 'add_action' && 
            selectedItem.type !== 'organization' ? (
            <ROPADetailsPanel
              itemType={selectedItem.type as 'repository' | 'activity' | 'data_element' | 'dpia' | 'risk'}
              data={(selectedItem.data as Repository | Activity | DataElement | DPIA | Risk) || null}
              isRefreshing={isRefreshing}
              locationById={locationById}
              departmentById={departmentById}
              systemById={systemById}
            />
          ) : (
            <Box sx={{ p: 2, height: '100%', minHeight: 600 }}>
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight={400}
                textAlign="center"
              >
                <StorageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No item selected
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click on an item in the tree to view its details
                </Typography>
              </Box>
            </Box>
          )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Repository Form Dialog */}
      {id && (
        <RepositoryFormDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            // Refresh tree to show newly created entities even if form was cancelled
            fetchROPAData(true);
            // Don't clear editingRepository here - we need it for the reset effect
            // It will be updated when selectedItem updates after save
          }}
          onSuccess={handleDialogSuccess}
          tenantId={id}
          repository={editingRepository}
        />
      )}

      {/* Activity Form Dialog */}
      {id && editingRepositoryId && (
        <ActivityFormDialog
          open={activityDialogOpen}
          onClose={() => {
            setActivityDialogOpen(false);
            setEditingActivity(null);
            setEditingRepositoryId(null);
            // Refresh tree to show newly created entities even if form was cancelled
            fetchROPAData(true);
          }}
          onSuccess={handleDialogSuccess}
          tenantId={id}
          repositoryId={editingRepositoryId}
          activity={editingActivity}
        />
      )}

      {/* DataElement Form Dialog */}
      {id && editingActivityId && (
        <DataElementFormDialog
          open={dataElementDialogOpen}
          onClose={() => {
            setDataElementDialogOpen(false);
            setEditingDataElement(null);
            setEditingActivityId(null);
            // Refresh tree to show newly created entities even if form was cancelled
            fetchROPAData(true);
          }}
          onSuccess={handleDialogSuccess}
          tenantId={id}
          activityId={editingActivityId}
          dataElement={editingDataElement}
        />
      )}

      {/* DPIA Form Dialog */}
      {id && editingActivityId && (
        <DPIAFormDialog
          open={dpiaDialogOpen}
          onClose={() => {
            setDpiaDialogOpen(false);
            setEditingDPIA(null);
            setEditingActivityId(null);
            // Refresh tree to show newly created entities even if form was cancelled
            fetchROPAData(true);
          }}
          onSuccess={handleDialogSuccess}
          tenantId={id}
          activityId={editingActivityId}
          dpia={editingDPIA}
        />
      )}

      {/* Risk Form Dialog */}
      {id && editingDPIAId && (
        <RiskFormDialog
          open={riskDialogOpen}
          onClose={() => {
            setRiskDialogOpen(false);
            setEditingRisk(null);
            setEditingDPIAId(null);
            // Refresh tree to show newly created entities even if form was cancelled
            fetchROPAData(true);
          }}
          onSuccess={handleDialogSuccess}
          tenantId={id}
          dpiaId={editingDPIAId}
          risk={editingRisk}
        />
      )}
    </PageLayout>
  );
}

