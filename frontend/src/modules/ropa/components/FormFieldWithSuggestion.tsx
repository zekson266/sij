/**
 * FormFieldWithSuggestion - Wrapper component that adds AI suggestion UI to form fields.
 * 
 * Combines a form field with SuggestButton and SuggestionDisplay.
 */

import * as React from 'react';
import { Box, Stack } from '@mui/material';
import { FormTextField, FormSelect } from '../../../components/common';
import SuggestButton from './SuggestButton';
import SuggestionDisplay from './SuggestionDisplay';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import type { TextFieldProps } from '@mui/material';
import type { SuggestionJobStatus } from '../services/ropaApi';

interface FormFieldWithSuggestionProps<T extends FieldValues> {
  // Form field props
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  fieldType: 'text' | 'select' | 'textarea' | 'multiline' | 'multiselect';
  required?: boolean;
  
  // Field-specific props
  textFieldProps?: Omit<TextFieldProps, 'name' | 'control' | 'label' | 'required'>;
  selectOptions?: Array<{ value: string; label: string }>;
  
  // Suggestion props
  jobStatus: SuggestionJobStatus | null;
  onSuggest: () => void;
  onAccept: (suggestion: string | string[]) => void;
  onDismiss?: () => void;
  isSuggesting?: boolean;
  isRestoring?: boolean; // Show skeleton loader during initial restoration (currently not active due to React 19 batching)
  
  // Layout
  fullWidth?: boolean;
  
  // Multiselect support
  isMultiselect?: boolean;
  children?: React.ReactNode; // For custom multiselect fields (like Autocomplete)
}

export default function FormFieldWithSuggestion<T extends FieldValues>({
  name,
  control,
  label,
  fieldType,
  required = false,
  textFieldProps,
  selectOptions,
  jobStatus,
  onSuggest,
  onAccept,
  onDismiss,
  isSuggesting = false,
  isRestoring = false,
  fullWidth = true,
  isMultiselect = false,
  children,
}: FormFieldWithSuggestionProps<T>) {
  const handleAccept = React.useCallback(
    (suggestion: string | string[]) => {
      onAccept(suggestion);
      // Dismiss suggestions when:
      // 1. Single accept for non-multiselect fields
      // 2. Accept All (array) for any field type
      const isAcceptAll = Array.isArray(suggestion);
      if (onDismiss && (!isMultiselect || isAcceptAll)) {
        onDismiss();
      }
    },
    [onAccept, onDismiss, isMultiselect]
  );

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
      <Stack spacing={1}>
        {/* Field with Suggest Button */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            {fieldType === 'multiselect' && children ? (
              // Custom multiselect field (like Autocomplete)
              children
            ) : fieldType === 'select' && selectOptions ? (
              <FormSelect
                name={name}
                control={control}
                label={label}
                options={selectOptions}
                required={required}
                fullWidth={fullWidth}
              />
            ) : (
              <FormTextField
                name={name}
                control={control}
                label={label}
                required={required}
                multiline={fieldType === 'textarea' || fieldType === 'multiline'}
                rows={fieldType === 'textarea' ? 3 : fieldType === 'multiline' ? 4 : undefined}
                fullWidth={fullWidth}
                {...textFieldProps}
              />
            )}
          </Box>
          <Box sx={{ pt: fieldType === 'textarea' || fieldType === 'multiline' || fieldType === 'multiselect' ? 0 : 1 }}>
            <SuggestButton
              onClick={onSuggest}
              isLoading={isSuggesting}
              size="small"
            />
          </Box>
        </Box>

        {/* Suggestion Display */}
        <SuggestionDisplay
          jobStatus={jobStatus}
          onAccept={handleAccept}
          onDismiss={onDismiss}
          isMultiselect={isMultiselect || fieldType === 'multiselect'}
          isRestoring={isRestoring}
          selectOptions={fieldType === 'select' ? selectOptions : undefined}
        />
      </Stack>
    </Box>
  );
}


