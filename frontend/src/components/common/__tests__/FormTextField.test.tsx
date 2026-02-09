/**
 * Tests for FormTextField component.
 * This is a sample test to verify the testing setup works.
 */

import { describe, it, expect } from 'vitest'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { renderWithProviders, screen } from '../../../utils/testUtils'
import { FormTextField } from '../FormTextField'

// Test schema
const testSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required'),
})

type TestFormData = z.infer<typeof testSchema>

// Test component that uses FormTextField
function TestForm() {
  const { control } = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      email: '',
      name: '',
    },
  })

  return (
    <form>
      <FormTextField
        name="email"
        control={control}
        label="Email"
        type="email"
        required
      />
      <FormTextField
        name="name"
        control={control}
        label="Name"
        required
      />
    </form>
  )
}

describe('FormTextField', () => {
  it('renders with label', () => {
    renderWithProviders(<TestForm />)
    
    // Material UI uses text content for labels, so we can query by text
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    
    // Also verify inputs are present
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument()
  })

  it('shows required indicator', () => {
    renderWithProviders(<TestForm />)
    
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    expect(emailInput).toBeRequired()
  })

  it('accepts user input', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    
    renderWithProviders(<TestForm />)
    
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    await user.type(emailInput, 'test@example.com')
    
    expect(emailInput).toHaveValue('test@example.com')
  })
})

