// NextAuth.js v5 Configuration
// Multi-tenant authentication with credentials and OAuth

import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@tournament/shared';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate input
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;

        // Find user
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            organizationMembers: {
              include: {
                organization: true,
              },
            },
          },
        });

        if (!user || !user.password) {
          return null;
        }

        // Verify password
        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (!passwordsMatch) {
          return null;
        }

        // Return user with org context
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          // Add first organization to session (user can switch orgs later)
          orgId: user.organizationMembers[0]?.orgId,
          orgSlug: user.organizationMembers[0]?.organization.slug,
          role: user.organizationMembers[0]?.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Add org context to token on sign in
      if (user) {
        token.orgId = user.orgId;
        token.orgSlug = user.orgSlug;
        token.role = user.role;
      }

      // Allow org switching via session update
      if (trigger === 'update' && session?.orgId) {
        token.orgId = session.orgId;
        token.orgSlug = session.orgSlug;
        token.role = session.role;
      }

      return token;
    },
    async session({ session, token }) {
      // Add org context to session
      if (token?.sub) {
        session.user.id = token.sub;
        session.user.orgId = token.orgId as string;
        session.user.orgSlug = token.orgSlug as string;
        session.user.role = token.role as string;
      }

      return session;
    },
  },
});
