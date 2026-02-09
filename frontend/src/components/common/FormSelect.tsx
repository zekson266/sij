/**
 * Material UI Select component integrated with React Hook Form.
 * Provides consistent styling and error handling.
 */

import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import type { SelectProps } from '@mui/material';
import { Controller } from 'react-hook-form';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

interface SelectOption {
  value: string | number;
  label: string;
}

interface FormSelectProps<T extends FieldValues> extends Omit<SelectProps, 'name' | 'control' | 'value' | 'onChange' | 'sx'> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  options: SelectOption[];
  required?: boolean;
  helperText?: string;
  sx?: SelectProps['sx'];
}

/**
 * Select component integrated with React Hook Form.
 * Automatically handles validation errors and displays them.
 */
export function FormSelect<T extends FieldValues>({
  name,
  control,
  label,
  options,
  required = false,
  helperText,
  ...selectProps
}: FormSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl
          fullWidth={selectProps.fullWidth !== false}
          error={!!fieldState.error}
          required={required}
        >
          <InputLabel>{label}</InputLabel>
          <Select
            {...selectProps}
            {...field}
            label={label}
            value={field.value ?? ''}
          >
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {(fieldState.error || helperText) && (
            <FormHelperText>
              {fieldState.error?.message || helperText}
            </FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

