# Frontend Testing Guide

## Quick Start

```bash
# Run tests in watch mode (recommended during development)
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

Tests should be placed next to the components they test:

```
src/
  components/
    common/
      FormTextField.tsx
      __tests__/
        FormTextField.test.tsx
```

Or use the `.test.tsx` or `.spec.tsx` suffix:

```
src/
  components/
    common/
      FormTextField.tsx
      FormTextField.test.tsx
```

## Writing Tests

### Basic Component Test

```tsx
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '../../utils/testUtils'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Testing Forms with React Hook Form

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormTextField } from '../FormTextField'

const schema = z.object({
  email: z.string().email(),
})

function TestForm() {
  const { control } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  return (
    <form>
      <FormTextField name="email" control={control} label="Email" />
    </form>
  )
}

describe('MyForm', () => {
  it('renders form fields', () => {
    renderWithProviders(<TestForm />)
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
  })
})
```

### Testing User Interactions

```tsx
import { userEvent } from '@testing-library/user-event'

it('handles user input', async () => {
  const user = userEvent.setup()
  renderWithProviders(<MyComponent />)
  
  const input = screen.getByRole('textbox')
  await user.type(input, 'test@example.com')
  
  expect(input).toHaveValue('test@example.com')
})
```

## Test Utilities

### `renderWithProviders`

Use this instead of the default `render` from React Testing Library. It includes:
- React Router
- Material UI Theme
- Auth Context

```tsx
import { renderWithProviders } from '../utils/testUtils'

renderWithProviders(<MyComponent />)
```

## Best Practices

1. **Test behavior, not implementation** - Test what users see and do
2. **Use accessible queries** - Prefer `getByRole`, `getByLabelText`
3. **Keep tests simple** - One assertion per test when possible
4. **Test user flows** - Test complete interactions, not just rendering
5. **Mock external dependencies** - Mock API calls, external services

## Common Patterns

### Testing API Calls

```tsx
import { vi } from 'vitest'

// Mock the API module
vi.mock('../services/api', () => ({
  apiGet: vi.fn().mockResolvedValue({ data: 'test' }),
}))
```

### Testing Navigation

```tsx
import { renderWithProviders, screen } from '../utils/testUtils'
import { useNavigate } from 'react-router'

// Navigation is automatically mocked in test environment
```

### Testing Context Providers

```tsx
// renderWithProviders already includes AuthProvider
// For custom contexts, wrap in your test:

function CustomWrapper({ children }) {
  return (
    <MyCustomProvider>
      {children}
    </MyCustomProvider>
  )
}

render(<MyComponent />, { wrapper: CustomWrapper })
```

## Running Tests

### Watch Mode (Development)
```bash
npm test
```
Runs tests in watch mode - re-runs on file changes

### Single Run (CI)
```bash
npm run test:run
```
Runs all tests once and exits

### UI Mode
```bash
npm run test:ui
```
Opens Vitest UI in browser for interactive testing

### Coverage
```bash
npm run test:coverage
```
Generates coverage report

## Troubleshooting

### "Cannot find module" errors
- Ensure imports use correct paths
- Check `vitest.config.ts` alias configuration

### Material UI components not rendering
- Ensure `setupTests.ts` is configured
- Check that `@testing-library/jest-dom` is imported

### Tests timing out
- Increase timeout in test: `it('test', async () => { ... }, { timeout: 10000 })`
- Check for infinite loops or unresolved promises

## Example Test Files

See `src/components/common/__tests__/FormTextField.test.tsx` for a complete example.

