pnpm prisma migrate dev
What it does: Compares your prisma/schema.prisma against your local database. It creates a new .sql file in prisma/migrations/, applies it to your database, updates your TypeScript client types, and runs prisma db seed (if configured).
When to use: Local development whenever you change schema.prisma.

pnpm prisma migrate dev --name add_transactions_table
-new addition


pnpm prisma migrate dev --create-only
What it does: Creates the .sql migration file in prisma/migrations/ based on schema changes, but does not execute it against the database yet.
When to use: When you want to manually write or customize raw SQL (e.g., custom indexes, foreign key constraints, or triggers) before applying it.

pnpm prisma migrate reset
What it does: Completely drops your local database, recreates it from scratch, executes every migration file in order, and runs the seed script.
When to use: Local development when your local database schema is corrupt or out of sync with migration history.

pnpm prisma db pull
What it does: Reads an existing PostgreSQL database and updates prisma/schema.prisma to match its current structure.
When to use: When you write tables directly using .sql scripts or GUI tools (e.g., pgAdmin) and need your Prisma schema to mirror the database.

pnpm prisma generate
What it does: Parses prisma/schema.prisma and updates static TypeScript types inside node_modules/@prisma/client.
When to use:
Runs automatically after pnpm prisma migrate dev.
Must be run manually in multi-stage Docker builds.
Must be run manually on fresh repository clones (pnpm install).

pnpm prisma migrate deploy
What it does: Executes unapplied .sql migration files against the database. It never alters schema files, never resets data, and fails safely if a migration errors out.
When to use: Strictly in production, staging, or CI/CD startup scripts.

# Recommended Development Workflows
Workflow A: Prisma-First (Recommended)
1. Edit models in prisma/schema.prisma.

2. Generate migration and apply locally:

Bash
pnpm prisma migrate dev --name add_user_model

3. Commit schema.prisma and the prisma/migrations/ directory to Git.

4. On deployment (Docker / Production server):

Bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy



Workflow B: Raw SQL Scripts First
1. Create a migration placeholder:

Bash
pnpm prisma migrate dev --create-only --name manual_init

2. Open the created prisma/migrations/<timestamp>_manual_init/migration.sql file and paste your raw SQL statements.

3. Apply the custom migration to your local database:

Bash
pnpm prisma migrate dev

4. Update your Prisma schema and client types:

Bash
pnpm prisma db pull
pnpm prisma generate

5. Deploy to Production:

Bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy