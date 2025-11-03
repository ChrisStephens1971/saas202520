// Home Page - Redirects to Console or Login

import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect('/console');
  } else {
    redirect('/login');
  }
}
