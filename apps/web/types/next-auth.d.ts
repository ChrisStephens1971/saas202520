// Extended NextAuth types for multi-tenant context

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      orgId: string;
      orgSlug: string;
      role: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    orgId?: string;
    orgSlug?: string;
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    orgId?: string;
    orgSlug?: string;
    role?: string;
  }
}
