import * as React from 'react';
import { Container, Box, Stack, Typography } from '@mui/material';
import type { ContainerProps, SxProps, Theme } from '@mui/material';

export interface PageLayoutProps extends Omit<ContainerProps, 'sx' | 'title'> {
  children: React.ReactNode;
  /** Page title displayed in header */
  title?: React.ReactNode;
  /** Optional description text below title */
  description?: React.ReactNode;
  /** Action buttons/elements displayed in header (right-aligned) */
  actions?: React.ReactNode;
  /** Sub-navigation (tabs or button groups) displayed below header */
  subNavigation?: React.ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * PageLayout component provides standardized page structure for all pages.
 * 
 * Features:
 * - Consistent page header with title, description, and actions
 * - Optional sub-navigation slot (tabs/buttons)
 * - Body content area
 * - Responsive spacing and layout
 * - AppBar-aware (accounts for toolbar height)
 * 
 * Standard page structure:
 * 1. Global AppBar (handled by App.tsx)
 * 2. Page Header (title, description, actions)
 * 3. Sub-Navigation (optional tabs/buttons)
 * 4. Page Body (children)
 * 
 * @example
 * ```tsx
 * <PageLayout 
 *   maxWidth="md"
 *   title="My Tenants"
 *   description="Manage your tenant organizations"
 *   actions={<Button>Create Tenant</Button>}
 * >
 *   <Paper>Content here</Paper>
 * </PageLayout>
 * ```
 * 
 * @example With tabs
 * ```tsx
 * <PageLayout 
 *   maxWidth="md"
 *   title="Settings"
 *   subNavigation={
 *     <Tabs value={tab} onChange={handleChange}>
 *       <Tab label="Details" />
 *       <Tab label="Settings" />
 *     </Tabs>
 *   }
 * >
 *   <TabPanel>Content</TabPanel>
 * </PageLayout>
 * ```
 */
export default function PageLayout({
  children,
  title,
  description,
  actions,
  subNavigation,
  sx,
  ...containerProps
}: PageLayoutProps) {
  const hasHeader = title || description || actions;

  return (
    <Container
      {...containerProps}
      sx={{
        mt: 4,
        pb: 4, // Use padding-bottom instead of margin-bottom for better bottom spacing
        ...sx,
      }}
    >
      {/* Page Header */}
      {hasHeader && (
        <Box sx={{ mb: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          >
            <Box sx={{ flex: 1 }}>
              {title && (
                <Typography
                  variant="h4"
                  component="h1"
                  gutterBottom={!!description}
                >
                  {title}
                </Typography>
              )}
              {description && (
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              )}
            </Box>
            {actions && (
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  flexWrap: 'wrap',
                  alignItems: 'flex-start',
                }}
              >
                {actions}
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {/* Sub-Navigation */}
      {subNavigation && (
        <Box sx={{ mb: 2 }}>
          {subNavigation}
        </Box>
      )}

      {/* Page Body */}
      {children}
    </Container>
  );
}

