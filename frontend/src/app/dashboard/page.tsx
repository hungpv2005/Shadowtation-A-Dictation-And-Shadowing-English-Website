import { redirect } from 'next/navigation';

// UC-01 in the SRS redirects to /dashboard after login. The learning home is the dashboard.
export default function DashboardRedirect() {
  redirect('/');
}
