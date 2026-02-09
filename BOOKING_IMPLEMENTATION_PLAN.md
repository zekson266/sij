# Booking Functionality - Implementation Plan

## Overview
Implement booking system with inline form (service selector, date picker, time slots) + confirmation modal.

## Component Structure
- **BookingForm.tsx** - Inline component (service, date, time slots)
- **BookingConfirmationDialog.tsx** - Modal that opens when time slot clicked
- Integrated into **TenantPublicPage.tsx** (replaces "Book Now" button)

## Implementation Steps

### Phase 1: Frontend UI (No Backend)
1. **Step 1.1**: Create BookingForm with service selector (hardcoded options)
2. **Step 1.2**: Add date picker (HTML5 or MUI TextField)
3. **Step 1.3**: Add time slots grid (hardcoded 9 AM - 5 PM)
4. **Step 1.4**: Create confirmation dialog (opens on slot click)
5. **Step 1.5**: Integrate into TenantPublicPage

### Phase 2: Backend Foundation
6. **Step 2.1**: Create Appointment model + migration
7. **Step 2.2**: Create Pydantic schemas
8. **Step 2.3**: Create AppointmentService

### Phase 3: API Integration
9. **Step 3.1**: POST /api/tenants/{id}/appointments endpoint
10. **Step 3.2**: Frontend bookingApi.ts service
11. **Step 3.3**: Connect form to API (submit booking)

### Phase 4: Availability Logic
12. **Step 4.1**: GET /api/tenants/{id}/appointments/available endpoint
13. **Step 4.2**: Frontend fetch available slots
14. **Step 4.3**: Exclude booked appointments from available slots

### Phase 5: UX Enhancements
15. **Step 5.1**: Add notes field in dialog
16. **Step 5.2**: Loading/error states
17. **Step 5.3**: Validation and edge cases

## Current Status
- ✅ Route changed: `/book/:slug` → `/tenant/:slug`
- ✅ Tenant list on landing page working
- ✅ Build number tracking implemented
- ✅ **Phase 1 COMPLETE**: Frontend UI (Service selector, Date picker, Time slots, Confirmation dialog)
- ✅ **Phase 2 COMPLETE**: Backend Foundation (Model, Schemas, Service)
- ✅ **Phase 3 COMPLETE**: API Integration (Endpoints, Frontend service, Form connection)
- ✅ **Database**: Appointments table created and migration applied
- 🚧 **NEXT**: Phase 4 - Availability Logic (exclude booked appointments from available slots)

## Key Decisions
- Inline form (not modal) - always visible
- Confirmation modal opens when time slot clicked
- Use Material UI components (Select, TextField, Dialog, Grid, Button)
- Start with hardcoded data, add backend later
- Test after each step

## Files to Create/Modify

### New Files
- `frontend/src/components/booking/BookingForm.tsx`
- `frontend/src/components/booking/BookingConfirmationDialog.tsx`
- `backend/app/models/appointment.py`
- `backend/app/schemas/appointment.py`
- `backend/app/services/appointment.py`
- `backend/app/routers/appointments.py`
- `frontend/src/services/bookingApi.ts`

### Modified Files
- `frontend/src/pages/TenantPublicPage.tsx` (integrate BookingForm)
- `frontend/src/types/index.ts` (add Appointment type)
- `backend/app/main.py` (include appointments router)

## Testing Strategy
- Test after each step
- Visual/UX testing (rendering, responsive, states)
- Functional testing (interactions, API calls)
- Edge cases (empty states, errors, validation)

