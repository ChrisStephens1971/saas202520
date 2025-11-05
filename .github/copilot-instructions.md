# AI Agent Instructions for saas202520

## Project Overview
This is a multi-tenant tournament platform for Pool/Billiards with offline-first capabilities. The project uses a monorepo structure managed with Turborepo and pnpm workspaces.

## Key Architecture Patterns

### Multi-Tenant Architecture
- All database tables must include `tenant_id` column (except system tables)
- API endpoints must be tenant-scoped using subdomain model
- File storage must use tenant prefixes
- Always test cross-tenant isolation
- Reference: `technical/multi-tenant-architecture.md`

### Tech Stack
- Node.js >=20.0.0
- pnpm >=9.0.0 for package management
- Prisma for database ORM
- TypeScript for type safety
- Turborepo for monorepo management

## Project Structure
```
apps/
  ├── sync-service/  # Offline sync service
  └── web/          # Main web application
packages/           # Shared libraries
prisma/            # Database schema and migrations
```

## Development Workflows

### Setup
```bash
pnpm install        # Install dependencies
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run database migrations
pnpm db:seed       # Seed initial data
```

### Common Commands
- `pnpm dev` - Start development servers
- `pnpm test` - Run all tests
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

## Code Conventions

### Database
- Always use Prisma for database operations
- Include tenant isolation in every query
- Example query pattern:
  ```typescript
  const data = await prisma.table.findMany({
    where: {
      tenant_id: ctx.tenant.id,
      // other filters...
    }
  });
  ```

### API Endpoints
- Must validate tenant context in all requests
- Use strong TypeScript types for request/response
- Place endpoints in `apps/web/app/api/`

### Testing
- Write tests for cross-tenant isolation
- Test offline sync capabilities
- Place tests alongside source files with `.test.ts` suffix

## Documentation References
- `docs/SWARM-README.md` - Swarm implementation details
- `docs/API-PAYMENT-ENDPOINTS.md` - Payment API documentation
- `docs/JWT-TOKEN-FORMAT.md` - Authentication token format

## Project State Management
- Check `SPRINT-3-SCORING-IMPLEMENTATION-SUMMARY.md` for current sprint status
- New features should follow patterns in `WORKFLOW-ENFORCEMENT.md`
- Verify completed tasks against `SCORING-IMPLEMENTATION-COMPLETE.md`