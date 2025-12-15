# Changelog

## Latest Updates - December 15, 2025

### Fixed Authentication Issues

#### Issue 1: User Logged Out on Browser Refresh
**Problem:** Session was lost when browser was refreshed
**Solution:** 
- Added automatic session check on app initialization in AuthContext
- Session is now checked on mount and user stays logged in across refreshes
- JWT cookie persists across page reloads

**Files Modified:**
- `contexts/AuthContext.tsx` - Added `initialCheckDone` state and `useEffect` for initial session check

#### Issue 2: Dashboard Stuck on "Loading..." After First Login
**Problem:** Dashboard showed "Loading..." indefinitely after first login
**Solution:**
- Simplified dashboard session check to use the AuthContext state directly
- Removed duplicate session checking logic
- Login now properly sets user state before navigation

**Files Modified:**
- `contexts/AuthContext.tsx` - Fixed login flow to set user state properly
- `app/dashboard/page.tsx` - Simplified to use context state directly

### New Features

#### 1. Renamed "User Management" to "Settings"
- Sidebar menu item renamed from "User Management" to "Settings"
- Settings page now includes multiple configuration options

**Files Modified:**
- `components/DashboardLayout.tsx` - Updated menu item name and path

#### 2. Settings Page with Prefix Configuration
Admin can now configure serial number prefixes for:
- Quotations (default: SWQ)
- Jobs (default: SWJ)
- Estimates (default: SWE)

**Features:**
- Customize prefix for each document type
- See preview of how numbers will look (e.g., SWQ-001)
- Save button to update all prefixes at once

**Files Created:**
- `models/Settings.ts` - Settings schema
- `app/api/settings/route.ts` - GET and PUT endpoints
- `app/dashboard/settings/page.tsx` - Settings UI

**Files Modified:**
- `lib/counterService.ts` - Updated to use dynamic prefixes from settings

#### 3. Counter Reset Functionality
Admin can now reset serial number counters to restart from 001.

**Features:**
- Separate reset buttons for Quotation, Job, and Estimate counters
- Confirmation dialog before reset
- Cannot be undone (requires admin confirmation)

**Files Created:**
- `app/api/settings/reset-counter/route.ts` - Counter reset endpoint

**Files Modified:**
- `lib/counterService.ts` - Added `resetCounter()` function
- `app/dashboard/settings/page.tsx` - Reset counter UI

#### 4. Improved Settings Page Organization
Settings page now contains:
- User Management section with link to manage users
- Serial Number Prefixes configuration
- Counter reset options

**Files Modified:**
- `app/dashboard/users/page.tsx` - Added back link to Settings
- `app/dashboard/users/create/page.tsx` - Added back link to User Management

### Bug Fixes

#### Estimates Job Dropdown Issue
**Problem:** Job dropdown not showing jobs in estimates creation
**Solution:** Fixed `clientId` comparison to handle populated object from API

**Files Modified:**
- `app/dashboard/estimates/create/page.tsx` - Updated filtering logic to handle populated `clientId`

#### Quotation Form Auto-Submit Issue
**Problem:** Clicking "Add Row" button submitted the form
**Solution:** Added `type="button"` to prevent form submission

**Files Modified:**
- `components/ParticularsTable.tsx` - Added `type="button"` to Add Row and Remove buttons

#### Particulars Table Validation
**Problem:** "Expected number received string" error when creating quotations/estimates
**Solution:** 
- Proper number conversion in ParticularsTable
- Added `z.coerce.number()` in API schemas
- Filter out empty rows before submission

**Files Modified:**
- `components/ParticularsTable.tsx` - Improved number handling
- `app/api/quotations/route.ts` - Added type coercion
- `app/api/estimates/route.ts` - Added type coercion
- `app/dashboard/quotations/create/page.tsx` - Better validation
- `app/dashboard/estimates/create/page.tsx` - Better validation

#### Jobs PDF Export
**Feature:** Added PDF export functionality for jobs

**Files Modified:**
- `lib/pdfUtils.ts` - Added `generateJobPDF()` function
- `app/dashboard/jobs/page.tsx` - Added export button and handler
- `app/api/jobs/route.ts` - Added population of related job

### Dark Mode Removed
**Change:** Removed dark mode styles for consistent light mode display
**Files Modified:**
- `app/globals.css` - Removed dark mode media query

---

## Summary of All Changes

### Authentication Improvements
✅ Session persists across browser refreshes
✅ Dashboard loads immediately after login
✅ Proper session initialization on app load

### Settings Page
✅ Renamed "User Management" to "Settings"
✅ Centralized settings page for admin configuration
✅ Prefix customization for all serial numbers
✅ Counter reset functionality with confirmation
✅ User management accessible from Settings

### Bug Fixes
✅ Estimates job dropdown now works correctly
✅ Add Row button doesn't submit form
✅ Number type conversion fixed
✅ Empty rows handled properly
✅ Jobs can be exported as PDF

All changes are backward compatible and don't affect existing data.
