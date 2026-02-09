/**
 * useSuggestionJob - Hook for managing AI suggestion jobs.
 * 
 * Handles job creation, polling, and restoration.
 */

import * as React from 'react';
import {
  createSuggestionJob,
  getSuggestionJob,
  listSuggestionJobs,
  type SuggestionJobRequest,
  type SuggestionJobStatus,
  type ROPAEntityType,
} from '../services/ropaApi';
import { useNotification } from '../../../contexts';

interface UseSuggestionJobOptions {
  tenantId: string;
  entityType: ROPAEntityType;
  entityId: string | null;
  enabled?: boolean; // Whether to enable polling
}

export function useSuggestionJob({
  tenantId,
  entityType,
  entityId,
  enabled = true,
}: UseSuggestionJobOptions) {
  const { showError } = useNotification();
  
  
  // Map of field_name -> job status
  const [jobStatuses, setJobStatuses] = React.useState<
    Map<string, SuggestionJobStatus>
  >(new Map());
  
  // Version counter to track jobStatuses changes (for useMemo dependencies in form dialogs)
  const [jobStatusesVersion, setJobStatusesVersion] = React.useState(0);
  
  // Track if jobs are being restored (for skeleton loader during initial load)
  // NOTE: This state is used for both skeleton loader display and concurrency guard (isRestoringRef).
  // The skeleton loader currently doesn't appear due to React 19 automatic batching, but the state
  // is still needed for the concurrency guard to prevent multiple concurrent restoreJobs calls.
  // See: ROPA_SUGGESTION_BUG_ANALYSIS.md for details on React 19 limitation.
  const [isRestoring, setIsRestoring] = React.useState(false);
  
  // Map of field_name -> job_id (for tracking active jobs)
  const [activeJobIds, setActiveJobIds] = React.useState<Map<string, string>>(
    new Map()
  );
  

  // Set of declined job IDs (persisted in localStorage)
  const getDeclinedJobIds = React.useCallback((): Set<string> => {
    if (!entityId) return new Set();
    const key = `declined_suggestion_jobs_${entityType}_${entityId}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const jobIds = JSON.parse(stored) as string[];
        return new Set(jobIds);
      }
    } catch (err) {
      console.error('Failed to load declined job IDs:', err);
    }
    return new Set();
  }, [entityType, entityId]);

  // Save declined job IDs to localStorage
  const saveDeclinedJobIds = React.useCallback(
    (jobIds: Set<string>) => {
      if (!entityId) return;
      const key = `declined_suggestion_jobs_${entityType}_${entityId}`;
      try {
        localStorage.setItem(key, JSON.stringify(Array.from(jobIds)));
        // Update ref immediately for polling checks
        declinedJobIdsRef.current = new Set(jobIds);
      } catch (err) {
        console.error('Failed to save declined job IDs:', err);
      }
    },
    [entityType, entityId]
  );

  // Mark a job as declined
  const markJobAsDeclined = React.useCallback(
    (jobId: string) => {
      const currentDeclined = getDeclinedJobIds();
      const updated = new Set(currentDeclined);
      updated.add(jobId);
      saveDeclinedJobIds(updated);
    },
    [getDeclinedJobIds, saveDeclinedJobIds]
  );

  // Polling interval ref
  const pollingIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Ref to track active job IDs for polling (avoids closure issues)
  const activeJobIdsRef = React.useRef<Map<string, string>>(new Map());
  
  // Ref to track declined job IDs for immediate checks (avoids closure issues)
  const declinedJobIdsRef = React.useRef<Set<string>>(new Set());
  
  // Ref to track cleared fields in current session (prevents polling/restore from bringing them back)
  const clearedFieldsRef = React.useRef<Set<string>>(new Set());
  
  // Ref to track current jobStatuses (avoids closure issues in restoreJobs)
  const jobStatusesRef = React.useRef<Map<string, SuggestionJobStatus>>(new Map());
  
  // Ref to track current entityId (for validation in async operations)
  const entityIdRef = React.useRef<string | null>(entityId);

  // Ref to track if restoreJobs is currently running (prevents concurrent calls)
  const isRestoringRef = React.useRef(false);

  // Update entityId ref whenever it changes
  React.useEffect(() => {
    entityIdRef.current = entityId;
  }, [entityId]);

  // Create a suggestion job
  const createJob = React.useCallback(
    async (
      fieldName: string,
      fieldType: string,
      fieldLabel: string,
      currentValue: string,
      formData: Record<string, any>,
      fieldOptions?: string[]
    ) => {
      if (!entityId) {
        showError(`${entityType} ID is required`);
        return;
      }

      try {
        const request: SuggestionJobRequest = {
          field_name: fieldName,
          field_type: fieldType,
          field_label: fieldLabel,
          current_value: currentValue,
          form_data: formData,
          field_options: fieldOptions,
        };

        const response = await createSuggestionJob(tenantId, entityType, entityId, request);
        
        // Clear field from clearedFieldsRef when creating new job (allows polling to update state)
        if (clearedFieldsRef.current.has(fieldName)) {
          clearedFieldsRef.current.delete(fieldName);
        }
        
        // Update state
        setActiveJobIds((prev) => {
          const next = new Map(prev);
          next.set(fieldName, response.job_id);
          activeJobIdsRef.current = next; // Update ref
          return next;
        });

        // Set initial status
        setJobStatuses((prev) => {
          const next = new Map(prev);
          next.set(fieldName, {
            job_id: response.job_id,
            status: response.status,
            field_name: fieldName,
            field_label: fieldLabel,
            created_at: response.created_at,
            updated_at: response.created_at,
          });
          jobStatusesRef.current = next; // Update ref after setting value
          return next;
        });
        setJobStatusesVersion(prev => prev + 1);

        return response.job_id;
      } catch (err: any) {
        showError(err?.message || 'Failed to create suggestion job');
        throw err;
      }
    },
    [tenantId, entityType, entityId, showError]
  );

  // Poll for job status
  const pollJobStatus = React.useCallback(
    async (fieldName: string, jobId: string) => {
      if (!entityId) return;

      // Check if job has been declined before polling (prevents race condition)
      if (declinedJobIdsRef.current.has(jobId)) {
        // Job was declined, stop polling for this field
        setActiveJobIds((prev) => {
          const next = new Map(prev);
          next.delete(fieldName);
          activeJobIdsRef.current = next; // Update ref
          return next;
        });
        return null;
      }

      try {
        const status = await getSuggestionJob(tenantId, entityType, entityId, jobId);
        
        // Double-check declined status after fetching (prevents race condition)
        if (declinedJobIdsRef.current.has(jobId)) {
          // Job was declined while fetching, don't update state
          setActiveJobIds((prev) => {
            const next = new Map(prev);
            next.delete(fieldName);
            activeJobIdsRef.current = next; // Update ref
            return next;
          });
          return null;
        }
        
        // Check if field was cleared in current session (prevents flicker)
        if (clearedFieldsRef.current.has(fieldName)) {
          // Field was cleared, don't update state
          setActiveJobIds((prev) => {
            const next = new Map(prev);
            next.delete(fieldName);
            activeJobIdsRef.current = next; // Update ref
            return next;
          });
          return null;
        }
        
        // Check if field is still in activeJobIds (prevents race condition)
        if (!activeJobIdsRef.current.has(fieldName)) {
          // Field was removed from active jobs, don't update state
          return null;
        }
        
        // Verify the job ID matches what we expect (prevents race condition where job was replaced)
        const expectedJobId = activeJobIdsRef.current.get(fieldName);
        const currentJobInState = jobStatuses.get(fieldName);
        const currentJobIdInState = currentJobInState?.job_id;
        if (expectedJobId !== jobId) {
          // Job was replaced with a new one, don't update state with old job's status
          return null;
        }
        
        // CRITICAL: Also check if the current job in state is different from the job we're polling
        // This prevents updating state with an old job's status when a new job has already been created
        if (currentJobIdInState && currentJobIdInState !== jobId) {
          // There's a different job in state, don't update with old job's status
          return null;
        }
        
        setJobStatuses((prev) => {
          const next = new Map(prev);
          next.set(fieldName, status);
          jobStatusesRef.current = next; // Update ref after setting value
          return next;
        });
        setJobStatusesVersion(prev => {
          return prev + 1;
        });

        // If job is completed or failed, stop polling for this job
        if (status.status === 'completed' || status.status === 'failed') {
          setActiveJobIds((prev) => {
            const next = new Map(prev);
            next.delete(fieldName);
            activeJobIdsRef.current = next; // Update ref
            return next;
          });
        }

        return status;
      } catch (err: any) {
        console.error(`Failed to poll job ${jobId}:`, err);
        // Don't show error to user for polling failures
      }
    },
    [tenantId, entityType, entityId]
  );

  // Restore jobs when form opens
  const restoreJobs = React.useCallback(async () => {
    if (!entityId || !enabled) return;

    // Prevent concurrent calls - if already restoring, skip
    if (isRestoringRef.current) {
      return;
    }

    // Set isRestoring to true immediately (synchronously) before any async operations
    isRestoringRef.current = true;
    setIsRestoring(true);
    try {
      // Fetch all jobs (API doesn't support comma-separated status)
      const response = await listSuggestionJobs(tenantId, entityType, entityId);

      const newJobStatuses = new Map<string, SuggestionJobStatus>();
      const newActiveJobIds = new Map<string, string>();

      // Group jobs by field_name and get the most recent one for each field
      const jobsByField = new Map<string, typeof response.jobs[0]>();
      for (const job of response.jobs) {
        const existing = jobsByField.get(job.field_name);
        if (!existing || new Date(job.created_at) > new Date(existing.created_at)) {
          jobsByField.set(job.field_name, job);
        }
      }

      // Load declined job IDs (use ref for immediate check, then sync from localStorage)
      const declinedIds = getDeclinedJobIds();
      // Update ref immediately for polling checks
      declinedJobIdsRef.current = new Set(declinedIds);

      // Clear any stale clearedFieldsRef entries that don't match current jobs
      // This prevents clearedFieldsRef from blocking suggestions for fields that have new jobs
      const currentFieldNames = new Set(jobsByField.keys());
      const staleClearedFields: string[] = [];
      clearedFieldsRef.current.forEach(fieldName => {
        if (!currentFieldNames.has(fieldName)) {
          // Field doesn't exist in current jobs, remove from clearedFieldsRef
          clearedFieldsRef.current.delete(fieldName);
          staleClearedFields.push(fieldName);
        }
      });

      // Fetch full status for the most recent job of each field
      for (const [fieldName, job] of jobsByField.entries()) {
        // Skip jobs that have been declined (check both ref and localStorage)
        if (declinedIds.has(job.job_id) || declinedJobIdsRef.current.has(job.job_id)) {
          continue;
        }
        
        // Skip fields that were cleared in current session (prevents flicker)
        if (clearedFieldsRef.current.has(fieldName)) {
          continue;
        }

        // Fetch full job status
        const fullStatus = await getSuggestionJob(
          tenantId,
          entityType,
          entityId,
          job.job_id
        );
        
        // Double-check declined status after fetching (prevents race condition)
        if (declinedJobIdsRef.current.has(job.job_id)) {
          continue;
        }
        
        // Double-check cleared status after fetching (prevents race condition)
        if (clearedFieldsRef.current.has(fieldName)) {
          continue;
        }
        
        // CRITICAL: Check if there's a newer job in state than what's in the API
        // This prevents restoreJobs from overwriting a job that was just created
        // Use ref to avoid closure issues - always get the latest jobStatuses
        const currentJobInState = jobStatusesRef.current.get(fieldName);
        if (currentJobInState) {
          const currentJobCreatedAt = new Date(currentJobInState.created_at);
          const apiJobCreatedAt = new Date(job.created_at);
          
          // If state has a newer job, keep it instead of restoring from API
          if (currentJobCreatedAt > apiJobCreatedAt) {
            newJobStatuses.set(fieldName, currentJobInState);
            
            // Track active jobs for polling
            if (currentJobInState.status === 'pending' || currentJobInState.status === 'processing') {
              newActiveJobIds.set(fieldName, currentJobInState.job_id);
            }
            continue;
          }
        }
        
        newJobStatuses.set(fieldName, fullStatus);
        
        // Track active jobs for polling
        if (fullStatus.status === 'pending' || fullStatus.status === 'processing') {
          newActiveJobIds.set(fieldName, job.job_id);
        }
      }

      
      // CRITICAL: Validate that entityId hasn't changed during async operation
      // If entityId changed, don't set state (prevents setting state for wrong entity)
      if (entityIdRef.current !== entityId) {
        return; // Don't set state for wrong entity
      }
      
      setJobStatuses(() => {
        return newJobStatuses;
      });
      jobStatusesRef.current = newJobStatuses; // Update ref
      setJobStatusesVersion(prev => prev + 1);
      setActiveJobIds(() => {
        return newActiveJobIds;
      });
      activeJobIdsRef.current = newActiveJobIds; // Update ref
    } catch (err: any) {
      console.error('Failed to restore jobs:', err);
      // Don't show error to user for restoration failures
    } finally {
      isRestoringRef.current = false;
      setIsRestoring(false);
    }
  }, [tenantId, entityType, entityId, enabled, getDeclinedJobIds]);

  // Clear all state when entity changes or dialog closes
  React.useEffect(() => {
    
    // Stop polling when entity changes or dialog closes
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Clear all state when entity changes or dialog closes
    // This prevents state leakage between different entities or dialog sessions
    setJobStatuses(new Map());
    jobStatusesRef.current = new Map();
    setActiveJobIds(new Map());
    activeJobIdsRef.current = new Map();
    setIsRestoring(false);
    isRestoringRef.current = false; // Reset concurrency guard
    clearedFieldsRef.current.clear();
  }, [entityId, enabled]);

  // Polling effect - restart when activeJobIds changes or when enabled changes
  React.useEffect(() => {
    if (!enabled) {
      // Clear polling when disabled (form closed)
      // But DON'T clear activeJobIds - we want to restore them when form reopens
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    if (activeJobIds.size === 0) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Clear any existing interval before creating a new one
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 2 seconds for active jobs
    // Use ref to get current value, avoiding closure issues
    pollingIntervalRef.current = setInterval(() => {
      activeJobIdsRef.current.forEach((jobId, fieldName) => {
        pollJobStatus(fieldName, jobId);
      });
    }, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [enabled, activeJobIds, pollJobStatus]);

  // Note: restoreJobs is now called manually from form dialogs
  // This is more reliable than automatic restoration via useEffect

  // Get job status for a field
  const getJobStatus = React.useCallback(
    (fieldName: string): SuggestionJobStatus | null => {
      // Don't return job status if field was cleared (consistency with getAllActiveSuggestions)
      if (clearedFieldsRef.current.has(fieldName)) {
        return null;
      }
      return jobStatuses.get(fieldName) || null;
    },
    [jobStatuses]
  );

  // Clear job status for a field (marks job as declined)
  const clearJobStatus = React.useCallback(
    (fieldName: string) => {
      // Get current job ID for this field before clearing
      const currentJob = jobStatuses.get(fieldName);
      if (currentJob?.job_id) {
        // Mark this job as declined so it won't be restored
        markJobAsDeclined(currentJob.job_id);
        // Update ref immediately to prevent polling from restoring it
        declinedJobIdsRef.current.add(currentJob.job_id);
      }

      // Mark field as cleared in current session (prevents polling/restore from bringing it back)
      clearedFieldsRef.current.add(fieldName);

      // Remove from state immediately
      setJobStatuses((prev) => {
        const next = new Map(prev);
        next.delete(fieldName);
        jobStatusesRef.current = next; // Update ref
        return next;
      });
      setJobStatusesVersion(prev => prev + 1);
      setActiveJobIds((prev) => {
        const next = new Map(prev);
        next.delete(fieldName);
        activeJobIdsRef.current = next; // Update ref
        return next;
      });
    },
    [jobStatuses, markJobAsDeclined, entityId, isRestoring]
  );

  // Suggest all fields
  const suggestAll = React.useCallback(
    async (
      fields: Array<{ name: string; type: string; label: string }>,
      formData: Record<string, any>,
      fieldOptionsMap?: Record<string, string[]>
    ) => {
      if (!entityId) {
        showError(`${entityType} ID is required`);
        return;
      }

      // Clear all fields from clearedFieldsRef before creating new jobs
      // This allows polling to update state for all new jobs
      const fieldsToClear = fields.map(f => f.name);
      fieldsToClear.forEach(fieldName => {
        if (clearedFieldsRef.current.has(fieldName)) {
          clearedFieldsRef.current.delete(fieldName);
        }
      });

      const results: Array<{ fieldName: string; success: boolean; jobId?: string; error?: string }> = [];

      // Create jobs for all fields in parallel
      const promises = fields.map(async (field) => {
        try {
          const rawValue = formData[field.name];
          // Convert to string - handle null, undefined, arrays, objects, etc.
          let currentValue: string;
          if (rawValue == null) {
            currentValue = '';
          } else if (typeof rawValue === 'string') {
            currentValue = rawValue;
          } else if (Array.isArray(rawValue)) {
            // For arrays, join with comma or stringify
            currentValue = rawValue.length > 0 ? rawValue.join(', ') : '';
          } else if (typeof rawValue === 'object') {
            // For objects, stringify (shouldn't happen for text fields, but handle it)
            currentValue = JSON.stringify(rawValue);
          } else {
            // For numbers, booleans, etc., convert to string
            currentValue = String(rawValue);
          }
          
          const fieldOptions = fieldOptionsMap?.[field.name];
          const jobId = await createJob(
            field.name,
            field.type,
            field.label,
            currentValue,
            formData,
            fieldOptions
          );
          return { fieldName: field.name, success: true, jobId };
        } catch (err: any) {
          // Log detailed error for debugging
          console.error(`Failed to create suggestion job for field "${field.name}":`, {
            field,
            error: err,
            formDataValue: formData[field.name],
            formDataValueType: typeof formData[field.name],
          });
          return {
            fieldName: field.name,
            success: false,
            error: err?.message || err?.detail || 'Failed to create job',
          };
        }
      });

      const jobResults = await Promise.allSettled(promises);
      jobResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            fieldName: 'unknown',
            success: false,
            error: result.reason?.message || 'Unknown error',
          });
        }
      });

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      if (failCount > 0) {
        const failedFields = results
          .filter((r) => !r.success)
          .map((r) => `${r.fieldName}${r.error ? ` (${r.error})` : ''}`)
          .join(', ');
        showError(
          `Created suggestions for ${successCount} field(s). ${failCount} field(s) failed: ${failedFields}`
        );
      }

      return results;
    },
    [entityId, entityType, createJob, showError]
  );

  // Decline all active suggestions
  const declineAll = React.useCallback(() => {
    const declinedCount = jobStatuses.size;
    const declinedJobIds = new Set<string>();

    // Mark all active jobs as declined
    jobStatuses.forEach((jobStatus) => {
      if (jobStatus.job_id) {
        markJobAsDeclined(jobStatus.job_id);
        declinedJobIds.add(jobStatus.job_id);
      }
    });

    // Update ref immediately to prevent polling from restoring them
    declinedJobIdsRef.current = new Set([...declinedJobIdsRef.current, ...declinedJobIds]);

    // Clear all from state
    setJobStatuses(new Map());
    jobStatusesRef.current = new Map(); // Update ref
    setActiveJobIds(new Map());
    activeJobIdsRef.current = new Map();
    
    // Also clear clearedFieldsRef since we're declining everything
    clearedFieldsRef.current.clear();
    
    return declinedCount;
  }, [jobStatuses, markJobAsDeclined]);

  // Check if there are active suggestions
  const hasActiveSuggestions = React.useCallback(() => {
    return jobStatuses.size > 0;
  }, [jobStatuses]);

  // Get all active suggestions (completed jobs with suggestions)
  const getAllActiveSuggestions = React.useCallback(() => {
    const activeSuggestions = new Map<string, SuggestionJobStatus>();
    
    jobStatuses.forEach((jobStatus, fieldName) => {
      // Only include completed jobs that have suggestions
      if (jobStatus.status === 'completed' && jobStatus.suggestions && jobStatus.suggestions.length > 0) {
        // Don't include if field was cleared
        if (!clearedFieldsRef.current.has(fieldName)) {
          activeSuggestions.set(fieldName, jobStatus);
        }
      }
    });
    
    return activeSuggestions;
  }, [jobStatuses]);

  return {
    createJob,
    getJobStatus,
    clearJobStatus,
    restoreJobs,
    suggestAll,
    declineAll,
    hasActiveSuggestions,
    getAllActiveSuggestions,
    jobStatusesVersion, // Version counter for useMemo dependencies
    isRestoring, // Loading state for initial restoration (skeleton currently not active due to React 19 batching, but state needed for concurrency guard)
  };
}

