/**
 * Test utilities for React Testing Library.
 * Provides common helpers and wrappers for testing.
 */

import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from '../contexts/AuthContext'

// Create a test theme (can be customized)
const testTheme = createTheme()

/**
 * Custom render function that includes all providers.
 * Use this instead of the default render from @testing-library/react.
 * 
 * @example
 * ```tsx
 * import { renderWithProviders } from '../utils/testUtils'
 * 
 * test('my component', () => {
 *   const { getByText } = renderWithProviders(<MyComponent />)
 *   expect(getByText('Hello')).toBeInTheDocument()
 * })
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <ThemeProvider theme={testTheme}>
          <CssBaseline />
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'

