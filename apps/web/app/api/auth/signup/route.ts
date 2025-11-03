// Signup API Route - Creates user + organization atomically

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tournament/shared';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  orgName: z.string().min(1, 'Organization name is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, orgName } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create slug from org name (lowercase, replace spaces with hyphens)
    const baseSlug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Ensure slug is unique
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create user + organization + membership in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug,
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      // Create organization membership
      await tx.organizationMember.create({
        data: {
          orgId: org.id,
          userId: user.id,
          role: 'owner', // First user is always owner
        },
      });

      return { user, org };
    });

    return NextResponse.json(
      {
        message: 'Account created successfully',
        userId: result.user.id,
        orgId: result.org.id,
        orgSlug: result.org.slug,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
