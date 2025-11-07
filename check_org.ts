import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({ take: 5 });
  
  if (orgs.length > 0) {
    console.log('TENANT_ID=' + orgs[0].id);
  } else {
    const org = await prisma.organization.create({
      data: {
        name: 'Test Analytics Venue',
        slug: 'test-analytics-venue',
        email: 'test@analytics.com',
      }
    });
    console.log('TENANT_ID=' + org.id);
  }
  await prisma.$disconnect();
}

main().catch(console.error);
