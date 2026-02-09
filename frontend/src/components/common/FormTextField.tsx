/**
 * Material UI TextField component integrated with React Hook Form.
 * Provides consistent styling and error handling.
 */

import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import { Controller } from 'react-hook-form';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

interface FormTextFieldProps<T extends FieldValues> extends Omit<TextFieldProps, 'name' | 'control' | 'value' | 'onChange' | 'onBlur'> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  required?: boolean;
}

/**
 * TextField component integrated with React Hook Form.
 * Automatically handles validation errors and displays them.
 * 
 * @example
 * ```tsx
 * <FormTextField
 *   name="email"
 *   control={control}
 *   label="Email Address"
 *   type="email"
 *   required
 * />
 * ```
 */
export function FormTextField<T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  ...textFieldProps
}: FormTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...textFieldProps}
          {...field}
          label={label}
          required={required}
          error={!!fieldState.error}
          helperText={fieldState.error?.message || textFieldProps.helperText}
          fullWidth={textFieldProps.fullWidth !== false}
        />
      )}
    />
  );
}

