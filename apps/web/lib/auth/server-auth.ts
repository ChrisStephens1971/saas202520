import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export async function getOrgIdFromSession() {
  const session = await auth();

  if (!session?.user?.orgId) {
    redirect('/login');
  }

  return session.user.orgId;
}

export async function ensureOrgAccess(resourceOrgId: string) {
  const sessionOrgId = await getOrgIdFromSession();

  if (sessionOrgId !== resourceOrgId) {
    throw new Error('Forbidden: You do not have access to this resource');
  }

  return sessionOrgId;
}
