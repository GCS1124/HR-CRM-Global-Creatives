# HR CRM - Global Creative Services

Role-based frontend CRM built with React + Vite and fully wired to Supabase.

HR CRM Global Creatives is a modern, role-based Human Resources and Customer Relationship Management system tailored for Global Creative Services. It provides comprehensive HR tools including employee management, attendance tracking, leave management, payroll processing, recruitment workflows, and analytics dashboards for admins, alongside simplified self-service views for employees. Built with React, Tailwind CSS, TypeScript, and powered by Supabase for secure authentication and real-time database with Row Level Security (RLS).
## Stack

- Frontend: React + Vite + TypeScript + Tailwind CSS
- Auth: Supabase Auth (Email/Password + Google OAuth + GitHub OAuth)
- Data: Supabase Postgres + RLS (no local backend server)

## Workspaces

- Admin workspace: `/admin/*`
  - Dashboard, Employees, Attendance, Leave, Recruitment, Payroll, Settings
- Employee workspace: `/employee/*`
  - Dashboard, My Attendance, My Leave, My Payroll, My Profile

## Environment

Set frontend variables in `client/.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`)

For admin bootstrap script, also set shell env vars:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Run locally

```bash
npm install
npm install --prefix client
npm run dev
```

- Frontend: `http://localhost:5173`
- LAN access: `http://<your-local-ip>:5173`

## Build and lint

```bash
npm run lint
npm run build
```

## Supabase setup

1. Run `supabase/schema.sql` in Supabase SQL Editor.
2. Bootstrap the fixed admin account:

```bash
npm run setup:admin
```

This enforces:

- Admin account: `test@crm.co.in` / `@12131415@`
- All other profiles: `employee`

## OAuth checklist

### Google

- Google Cloud Console OAuth web client:
  - Authorized JS origins: app URLs (for example `http://localhost:5173`)
  - Redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
- Supabase Auth > Providers > Google:
  - Enable provider
  - Set client ID and secret

### GitHub

- GitHub Developer Settings OAuth App:
  - Homepage URL: `http://localhost:5173`
  - Callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`
- Supabase Auth > Providers > GitHub:
  - Enable provider
  - Set client ID and secret

### Supabase redirect URLs

In Supabase Auth > URL Configuration add:

- `http://localhost:5173/`
- `http://<your-local-ip>:5173/`

## Notes

- UI direction aligns with:
  - https://globalcreativeservices.us
  - https://gsc-version-2.vercel.app
  - https://crm.globalcreativeservices.us
- All role-based data access is enforced by Supabase RLS policies.
