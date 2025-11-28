/**
 * Select Organization Layout
 * Forces dynamic rendering since this page requires authentication
 */

export const dynamic = 'force-dynamic';

export default function SelectOrganizationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
