# Tamaji Leave Management System

A React + TypeScript application for managing employee leave requests, built with Vite, Tailwind CSS, and Supabase.

## Prerequisites

- Node.js 20+
- Supabase account and project

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup Environment Variables:
   Copy `.env.example` to `.env.local` and add your Supabase credentials.
   ```bash
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Supabase Setup

You must run the SQL scripts in the `supabase/` folder in your Supabase project's SQL Editor to set up the database. **Run them in this exact order:**

1. `supabase/schema.sql` - Creates tables, views, and auth trigger.
2. `supabase/rls.sql` - Sets up Row Level Security policies.
3. `supabase/seed.sql` - Provides instructions for adding initial data.

**Creating an Admin User:**
1. Sign up for a new account via the app's `/login` page.
2. The trigger will automatically create an `employee` profile.
3. Go to the Supabase Table Editor -> `profiles` table, and manually change the `role` column of your new user to `admin`.
4. Now you can access the `/admin/users` page to manage other users and grant leave balances.

## Deployment to Cloudflare Pages

This app is designed as a Single Page Application (SPA) and is perfect for Cloudflare Pages.

1. Build the project:
   ```bash
   npm run build
   ```
   (This creates a `dist` folder).

2. Cloudflare Pages Configuration:
   - **Framework Preset:** None (or Vite)
   - **Build Command:** `npm run build`
   - **Build Output Directory:** `dist`
   - **Environment Variables:**
     - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your Cloudflare Pages project settings.

3. **SPA Routing Setup:**
   For Cloudflare Pages to correctly handle React Router, you need to create a `_redirects` file in the `public/` directory (or ensure Vite handles it).
   Actually, Vite + Cloudflare Pages usually requires no extra routing config if you define the SPA catch-all, but you can explicitly add a file `public/_redirects` with:
   ```
   /* /index.html 200
   ```

## Architecture & Tech Stack
- **Frontend:** React 19, TypeScript strict, Vite
- **Styling:** Tailwind CSS
- **State Management:** React Query (TanStack Query) for data fetching
- **Routing:** React Router v6
- **Forms:** React Hook Form
- **Backend:** Supabase (Auth, Postgres, RLS)
