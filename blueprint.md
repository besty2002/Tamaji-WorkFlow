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

### 5. Notification System
- **In-App Notifications:** Real-time bell icon with unread badge count and a dedicated notifications page.
- **Automated Triggers:** 
    - When an employee submits a request, all managers/admins are notified.
    - When a request is approved/rejected, the employee is notified.
- **Email Notifications:** Supabase Edge Function sends emails via Resend when a new notification is created.
- **Idempotency:** Email sending status is tracked to prevent duplicate emails.
- **Real-time Updates:** Uses Supabase Realtime to update the notification badge instantly.

*   **Database Fixes:**
    - Added `num_days` column to `leave_requests` to fix schema cache errors.
    - Added `attachment_url` column for file support.
*   **Visibility Improvements:**
    - Updated RLS policies to ensure approved requests from all users (including admins/managers) are visible to everyone on the calendar.
