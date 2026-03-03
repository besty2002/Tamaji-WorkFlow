# Project Blueprint: Leave Management System (Tamaji Workflow)

## Overview
A comprehensive React + Supabase application for managing employee leave requests, grants, and team visibility via a shared calendar.

## Technical Stack
- **Frontend:** React (Vite, TypeScript), Tailwind CSS, Lucide React, TanStack Query.
- **Backend:** Supabase (Auth, PostgreSQL, Storage, RLS).
- **Date Handling:** date-fns.

## Implemented Features

### 1. Authentication & Profile Management
- **Role-based Access:** Roles include `employee`, `manager`, and `admin`.
- **Auto-Profile Creation:** Trigger-based profile creation upon auth signup.
- **Profile Settings:** Users can update their display name.

### 2. Leave Requests
- **Request Form:** Support for various leave types (paid, sick, special, unpaid), date ranges, and half-day requests.
- **Business Day Calculation:** Automatically excludes weekends and public holidays.
- **File Attachments:** Users can upload documents (e.g., medical certificates) to Supabase Storage.
- **Drafts:** Support for saving requests as drafts before submission.

### 3. Management & Admin Tools
- **Manage Requests:** Managers and Admins can approve or reject submitted requests with comments.
- **User Management (Admin Only):** Admins can grant additional leave days to users and manage user roles.
- **Leave Balance:** Real-time calculation of leave balance via a PostgreSQL view (`leave_balance_view`).

### 4. Visibility & Calendar
- **Shared Calendar:** A team-wide calendar showing all **approved** leave requests.
- **RLS Security:**
    - Users can see their own requests and grants.
    - Everyone can see **approved** requests (for calendar visibility).
    - Managers/Admins can see all requests for processing.

## Current Plan (Updates)

*   **Database Fixes:**
    - Added `num_days` column to `leave_requests` to fix schema cache errors.
    - Added `attachment_url` column for file support.
*   **Visibility Improvements:**
    - Updated RLS policies to ensure approved requests from all users (including admins/managers) are visible to everyone on the calendar.
