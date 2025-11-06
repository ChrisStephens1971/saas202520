/**
 * Admin Root Redirect
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Redirects /admin to /admin/dashboard
 */

import { redirect } from 'next/navigation';

export default function AdminRootPage() {
  redirect('/admin/dashboard');
}
