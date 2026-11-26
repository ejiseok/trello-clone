import type { ComponentProps } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface FormTextFieldProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  type?: ComponentProps<'input'>['type']
  autoComplete?: string
  placeholder?: string
  autoFocus?: boolean
}

/** react-hook-form Controller + shadcn Field 조합 텍스트 입력 */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: FormTextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Input
            {...field}
            {...inputProps}
            id={field.name}
            value={field.value ?? ''}
            aria-invalid={fieldState.invalid}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
