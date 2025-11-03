// Prisma Seed Script - Development Data
// Creates sample organizations, users, and tournaments for local development

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clear existing data (development only!)
  console.log('Clearing existing data...');
  await prisma.tournamentEvent.deleteMany();
  await prisma.table.deleteMany();
  await prisma.match.deleteMany();
  await prisma.player.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.sportConfig.deleteMany();
  console.log('✓ Cleared existing data\n');

  // Create sport configs
  console.log('Creating sport configurations...');
  const poolConfig = await prisma.sportConfig.create({
    data: {
      id: 'pool-8ball-v1',
      name: '8-Ball Pool',
      sport: 'pool',
      version: '1.0',
      rules: {
        rackType: '8-ball',
        winCondition: 'sink-8-after-group',
        fouls: ['scratch', 'wrong-ball-first', 'no-rail'],
      },
      scoringSchema: {
        matchFormat: 'race-to-X',
        defaultRace: 5,
        breakAndRun: 'winner-breaks',
      },
      bracketTemplates: {
        singleElimination: true,
        doubleElimination: true,
        roundRobin: true,
      },
    },
  });
  console.log('✓ Created sport config: 8-Ball Pool\n');

  // Organization 1: Phoenix Pool League
  console.log('Creating organization: Phoenix Pool League...');
  const org1 = await prisma.organization.create({
    data: {
      name: 'Phoenix Pool League',
      slug: 'phoenix-pool',
    },
  });

  const hashedPassword = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.create({
    data: {
      name: 'Mike Johnson',
      email: 'mike@phoenixpool.com',
      password: hashedPassword,
    },
  });

  await prisma.organizationMember.create({
    data: {
      orgId: org1.id,
      userId: user1.id,
      role: 'owner',
    },
  });
  console.log('✓ Created user: mike@phoenixpool.com (password: password123)');

  // Create tournaments for org1
  const tournament1 = await prisma.tournament.create({
    data: {
      orgId: org1.id,
      name: 'Weekly 8-Ball Tournament',
      status: 'active',
      format: '8-ball-single-elimination',
      sportConfigId: poolConfig.id,
      sportConfigVersion: poolConfig.version,
      createdBy: user1.id,
      startedAt: new Date(),
    },
  });

  const tournament2 = await prisma.tournament.create({
    data: {
      orgId: org1.id,
      name: 'Summer Championship 2025',
      status: 'registration',
      format: '8-ball-double-elimination',
      sportConfigId: poolConfig.id,
      sportConfigVersion: poolConfig.version,
      createdBy: user1.id,
    },
  });

  const tournament3 = await prisma.tournament.create({
    data: {
      orgId: org1.id,
      name: 'Friday Night League',
      status: 'draft',
      format: '8-ball-round-robin',
      sportConfigId: poolConfig.id,
      sportConfigVersion: poolConfig.version,
      createdBy: user1.id,
    },
  });
  console.log(`✓ Created 3 tournaments for Phoenix Pool League\n`);

  // Create players for active tournament
  const players = [
    { name: 'Alice Rodriguez', email: 'alice@example.com', phone: '555-0101' },
    { name: 'Bob Chen', email: 'bob@example.com', phone: '555-0102' },
    { name: 'Carol Martinez', email: 'carol@example.com', phone: '555-0103' },
    { name: 'David Kim', email: 'david@example.com', phone: '555-0104' },
    { name: 'Emma Taylor', email: 'emma@example.com', phone: '555-0105' },
    { name: 'Frank Wilson', email: 'frank@example.com', phone: '555-0106' },
    { name: 'Grace Lee', email: 'grace@example.com', phone: '555-0107' },
    { name: 'Henry Brown', email: 'henry@example.com', phone: '555-0108' },
  ];

  for (let i = 0; i < players.length; i++) {
    await prisma.player.create({
      data: {
        tournamentId: tournament1.id,
        name: players[i].name,
        email: players[i].email,
        phone: players[i].phone,
        status: 'checked-in',
        seed: i + 1,
        checkedInAt: new Date(),
        rating: {
          skillLevel: 3 + Math.floor(Math.random() * 5), // SL 3-7
          fargo: 400 + Math.floor(Math.random() * 300), // Fargo 400-700
        },
      },
    });
  }
  console.log(`✓ Created ${players.length} players for Weekly 8-Ball Tournament`);

  // Create tables
  const tables = ['Table 1', 'Table 2', 'Table 3', 'Table 4'];
  for (const label of tables) {
    await prisma.table.create({
      data: {
        tournamentId: tournament1.id,
        label,
        status: 'available',
      },
    });
  }
  console.log(`✓ Created ${tables.length} tables\n`);

  // Organization 2: Vegas Billiards Club
  console.log('Creating organization: Vegas Billiards Club...');
  const org2 = await prisma.organization.create({
    data: {
      name: 'Vegas Billiards Club',
      slug: 'vegas-billiards',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Sarah Davis',
      email: 'sarah@vegasbilliards.com',
      password: hashedPassword,
    },
  });

  await prisma.organizationMember.create({
    data: {
      orgId: org2.id,
      userId: user2.id,
      role: 'owner',
    },
  });
  console.log('✓ Created user: sarah@vegasbilliards.com (password: password123)');

  const tournament4 = await prisma.tournament.create({
    data: {
      orgId: org2.id,
      name: 'Monthly 9-Ball Open',
      status: 'registration',
      format: '9-ball-single-elimination',
      sportConfigId: poolConfig.id,
      sportConfigVersion: poolConfig.version,
      createdBy: user2.id,
    },
  });
  console.log('✓ Created tournament for Vegas Billiards Club\n');

  // Create some tournament events (audit log)
  await prisma.tournamentEvent.create({
    data: {
      tournamentId: tournament1.id,
      kind: 'tournament.started',
      actor: user1.id,
      device: 'web-console',
      payload: {
        startedAt: new Date().toISOString(),
        format: '8-ball-single-elimination',
        playerCount: 8,
      },
    },
  });

  await prisma.tournamentEvent.create({
    data: {
      tournamentId: tournament1.id,
      kind: 'player.registered',
      actor: user1.id,
      device: 'web-console',
      payload: {
        playerName: 'Alice Rodriguez',
        timestamp: new Date().toISOString(),
      },
    },
  });
  console.log('✓ Created tournament events (audit log)\n');

  console.log('✅ Seeding complete!\n');
  console.log('📊 Summary:');
  console.log(`   Organizations: 2`);
  console.log(`   Users: 2`);
  console.log(`   Tournaments: 4`);
  console.log(`   Players: ${players.length}`);
  console.log(`   Tables: ${tables.length}`);
  console.log('\n🔐 Login credentials:');
  console.log('   Email: mike@phoenixpool.com');
  console.log('   Email: sarah@vegasbilliards.com');
  console.log('   Password: password123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
