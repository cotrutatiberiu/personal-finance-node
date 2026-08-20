# Node.js + Express — Personal Finance App Roadmap

> Same app concept as the Java version: a personal finance tracker (accounts, categories, transactions, budgets, reports).
> **Goal of this version:** stop being someone who "fixed backend bugs" and become someone who *owns* a Node backend — auth, data modeling, API design, testing, deployment concerns.
> Use TypeScript. You already know it cold from React — there's no reason to write this in plain JS and lose type safety on money-handling code.
> Use Postman / Insomnia / Bruno for testing, same as the Java version.

---

## Before you start

- **Use TypeScript, not plain JS.** This is the single highest-leverage decision here. It's free confidence for you (you already know TS), it's what most serious Node teams use in 2026, and it makes the CV claim "Node + TypeScript backend" instead of just "Node backend."
- **Use Prisma** as your ORM. Closest mental model to what you learned with Flyway/JPA — migrations, schema-first, type-safe queries.
- **Docker + docker-compose for Postgres + Redis** — you already have this from the Java project, reuse it almost as-is.

---

## Phase 1 — Auth & Security Foundations

### What the user can do
- Register with email + password
- Login → access token (short-lived) + refresh token (longer-lived, HttpOnly cookie)
- Call a protected route to verify auth
- Refresh access token without re-login
- Logout (invalidate refresh token)

### Node/Express subjects covered (maps to your Java Phase 1)
- `bcrypt` — password hashing (equivalent of `BCryptPasswordEncoder`)
- `jsonwebtoken` — access + refresh tokens, **separate signing secrets per token type**, same as Java
- Custom Express middleware as your auth filter (equivalent of `OncePerRequestFilter`)
- Route-level middleware composition = your `SecurityFilterChain` equivalent (which routes are public vs protected)
- Stateless by design (no server sessions) — same reasoning as `SessionCreationPolicy.STATELESS`
- CORS handling — **this doesn't exist in the Java version's Phase 1 note, but it's a real Node gotcha**: configure `cors` middleware deliberately (allowed origins, credentials: true for cookies), don't just slap `cors()` open on everything
- Centralized error-handling middleware (Express's `(err, req, res, next)` signature) — equivalent of `@ControllerAdvice`
- Custom error classes (`EmailAlreadyUsedError`, `RefreshTokenExpiredError`, etc.) extending a base `AppError`
- `zod` schemas as DTOs + validation (equivalent of Records + `@Valid`/Jakarta annotations)
- Prisma schema + migrations — never let anything auto-sync your schema in a way you don't control
- `helmet` — sets sane security headers by default. **Not in your Java notes at all; add it, it's a 2-line win reviewers notice**
- `dotenv` + a validated env config module (fail fast at boot if a required env var is missing — a very common thing juniors get wrong)

### Node-specific traps to know about (interview-relevant, no Java equivalent)
- **Unhandled promise rejections crash the process** in Node. Wrap every async route handler (or use `express-async-errors`) so a thrown error inside `async (req, res) => {}` actually reaches your error middleware instead of hanging or crashing.
- **Refresh token storage**: decide and be able to explain your choice — DB-tracked refresh tokens (revocable, more work) vs stateless refresh JWTs (simpler, harder to revoke). Java roadmap doesn't force this decision explicitly; Node makes you own it.

---

## Phase 2 — Accounts — CRUD, Ownership & Proper REST

### What the user can do
- Create an account ("Main Bank", "Cash Wallet", "Savings")
- List all their accounts
- Update name/currency
- Archive (soft delete)
- Get single account by ID (404 if not found **or not theirs**)

### Node/Express subjects covered (maps to Java Phase 2)
- Proper HTTP status codes (201, 200, 204, 404, 403) — same discipline, just `res.status(201).json(...)`
- `zod` validation on request bodies/params
- Service layer pattern — even though Node doesn't force interfaces like Java, **still separate controller → service → repository (Prisma calls)**. Don't put Prisma calls directly in controllers; this is the #1 thing that makes Node code look junior.
- Soft delete pattern — `archived` / `archivedAt` fields, identical concept to Java
- **Ownership validation** — every query scoped by `userId`, same as Java's `findByIdAndUserId`
- Custom exceptions per case, caught by your central error middleware
- Structured logging with `pino` (or `winston`) — **replace every `console.log`**, same rule as the Java `System.out.println` ban

```ts
// Never do this:
console.log("Creating account:", name);

// Do this:
logger.info({ userId, name }, "Creating account");
```

### Key pattern: Ownership check (Prisma version of your Java snippet)
```ts
async function getAccountForUser(accountId: string, userId: string) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new AccountNotFoundError(accountId);
  return account;
}
```
Same security reasoning as Java: return 404, not 403, when the resource belongs to someone else — don't leak existence.

---

## Phase 3 — Categories — Recursive Tree Structure

Directly portable from Java. Concepts are ORM-agnostic:
- Self-referencing relation in Prisma schema (`parentId String?`, self-relation)
- Unique constraint per parent (Prisma doesn't do partial indexes as cleanly as Postgres directly — you may need a raw SQL migration for the `WHERE parent_id IS NULL` unique index, which is itself a useful thing to know how to do in Prisma)
- Build tree from flat list using a `Map`, same algorithm, just TS instead of Java
- Cycle detection when reassigning a parent — same logic
- Recursive Zod schema / TS type for `CategoryResponse` with `children: CategoryResponse[]`

**Node-specific note:** Prisma migrations that need raw SQL (like the partial unique index) go in `prisma/migrations/.../migration.sql` — know how to hand-edit a generated migration. This comes up in real Node backend work more often than the Java equivalent, because Prisma's schema DSL doesn't cover every Postgres feature.

---

## Phase 4 — Transactions — Business Logic, Concurrency & Money

### What the user can do
Same as Java version: record income/expense, auto-updating balance, edit (reverse+reapply), delete (reverse), filters, pagination, tags.

### Node/Express subjects covered
- **Prisma `$transaction`** — equivalent of `@Transactional`, wraps multiple writes atomically
- **Optimistic locking in Prisma** — Prisma has no built-in `@Version` annotation like JPA. You implement it yourself: add a `version Int` column, and on update do `where: { id, version }, data: { ..., version: { increment: 1 } }`. If zero rows are affected, someone else updated it first → throw a conflict error. **This is a genuinely good interview story** because you had to understand *why* `@Version` works, not just annotate it.
- **`Decimal` type, not `number`, for money** — Prisma has a `Decimal` type backed by `decimal.js`; never use JS `number`/`float` for currency, same rule as Java's `BigDecimal` ban, arguably more important in JS since floating point is even more of a footgun there
- Race condition test — same idea as Java: fire two concurrent requests updating the same account balance, prove it breaks without the version check, prove it's fixed with it
- Pagination via Prisma `skip`/`take` + a `Page<T>`-style response shape you define yourself (Prisma doesn't give you Spring's `Page<T>` for free — build a small generic `PaginatedResponse<T>` type)
- N+1 problem exists in Prisma too — fix with `include` (equivalent of `@EntityGraph`/`JOIN FETCH`)
- Many-to-many tags — Prisma implicit many-to-many first, then explicit join model when you need extra columns (`appliedAt`, etc.) — same progression as Java

### N+1 explained, Node version
```ts
// 51 queries (1 + 50 lazy loads) if you fetch account separately per transaction
// Fixed:
const transactions = await prisma.transaction.findMany({
  where: { userId },
  include: { account: true, category: true },
});
```

---

## Phase 5 — Testing (do this early, same as the Java plan)

### What you test
Same list as Java: services, controllers/routes, auth flows, concurrent balance updates, ownership checks.

### Node/Express subjects covered
- **Jest** — you already know this from frontend, huge head start here
- **Supertest** — the Node equivalent of `MockMvc`, fires real HTTP requests at your Express app in-memory
- Mocking Prisma calls for unit tests (`jest.mock` or a Prisma test client) — equivalent of Mockito's `@Mock`
- **Testcontainers for Node** exists (`testcontainers` npm package) — same real-Postgres-in-Docker approach as the Java plan, don't skip it just because it's "more common in Java"
- Integration tests that spin up the real Express app against a real (containerized) Postgres
- given/when/then or arrange/act/assert naming, same discipline

### Structure
```
src/
  __tests__/
    unit/
      account.service.test.ts
      transaction.service.test.ts
    integration/
      account.routes.test.ts
      transaction.routes.test.ts
      auth.routes.test.ts
```

### What interviewers actually ask (Node version)
- "How do you test a route that requires auth?" → Supertest + a real or mocked JWT
- "How do you avoid hitting a real DB in unit tests?" → mock the Prisma client
- "Unit vs integration test in a Node/Express app?" → mocked service layer vs real app + real DB via Testcontainers

---

## Phase 6 — Budgets + Aggregations + Dynamic Filters

Directly portable:
- Prisma `groupBy` for `SUM`/`GROUP BY` equivalents
- Raw SQL (`prisma.$queryRaw`) when Prisma's query builder can't express something (date truncation, complex aggregates) — **know when to drop to raw SQL, it's a sign of maturity, not a failure**
- Dynamic `WHERE` clause building — Prisma's `where` objects compose naturally with plain TS, no need for anything like `Specification<T>`; this is actually *easier* in Node than Java, worth knowing
- Index usage on `(user_id, occurred_at)` — same DB-level reasoning regardless of language/ORM

---

## Phase 7 — Caching + Scheduled Jobs

### Node/Express subjects covered
- `node-cron` — equivalent of `@Scheduled`
- Redis via `ioredis` — cache-aside pattern implemented by hand (Node doesn't have a built-in declarative `@Cacheable` equivalent as clean as Spring's; you write the get-or-set logic yourself, which is actually good — you'll understand caching better than someone who just annotated it)
- TTL and manual invalidation on writes (equivalent of `@CacheEvict`)
- Cache key design, same principle as Java (`userId:month`)

---

## Phase 8 — File Export + Background Processing

### Node/Express subjects covered
- `exceljs` — equivalent of Apache POI for `.xlsx` generation
- Streaming responses (`res.setHeader` + piping a stream) instead of loading the whole export into memory — same `StreamingResponseBody` idea
- `Content-Disposition` header for downloads
- **`BullMQ` + Redis** for real background job processing — this is arguably a stronger, more "hireable" story than Java's `@Async`, since job queues are a very common real-world Node pattern (email sending, exports, webhooks). Worth treating as a first-class skill, not an afterthought.

---

## Phase 9 — Authorization (RBAC) & Security Hardening

### Node/Express subjects covered
- Role-checking middleware (`requireRole('ADMIN')`) — equivalent of `@PreAuthorize`
- Extracting current user/roles from the verified JWT payload — equivalent of `SecurityContextHolder`
- Combine ownership + role checks
- 403 vs 404, same security reasoning as Java
- `/health` endpoint for uptime checks (Node has no Actuator equivalent out of the box — just build a small one; know why it needs to check DB/Redis connectivity, not just return 200)
- **`express-rate-limit`** — not in the Java roadmap at all, but a very standard, low-effort addition that signals security awareness
- Additional headers via `helmet` (revisit/tighten from Phase 1)

---

## Phase 10 — API Documentation & Final Polish

### What you add
- OpenAPI docs via `zod-to-openapi` (generates OpenAPI spec straight from your existing Zod schemas — nice synergy, less duplication than Java's separate annotations) or `swagger-jsdoc` if you'd rather write it by hand
- Consistent error response shape across the whole API
- Structured logging (`pino`) with request IDs
- README covering:
  - Architecture overview
  - How to run with Docker
  - Business rules
  - How concurrency on balances is handled (your hand-rolled optimistic locking — explain it, it's a strong section)
  - How ownership and RBAC work
  - Postman collection
- `npm audit` clean, dependency hygiene
- Final lint/format pass (ESLint + Prettier, configured strictly — same seriousness as Java code style)

---

## Things that exist in Node but have **no Java-roadmap equivalent** — don't skip these

These aren't in your Java plan at all, but they're standard expectations for a hireable Node backend dev:

1. **TypeScript config discipline** — `strict: true` in `tsconfig.json`, no `any` sprinkled around. A Node backend without strict TS reads as unserious to reviewers.
2. **`helmet` + `express-rate-limit`** — baseline security hygiene, cheap to add, commonly asked about.
3. **Graceful shutdown** — handle `SIGTERM`, close DB/Redis connections cleanly before the process exits. Matters a lot in containerized/K8s environments and is a real interview question ("what happens when your pod gets killed mid-request?").
4. **Connection pooling awareness** — know Prisma's connection pool limits and why you can't just spin up unlimited concurrent DB connections in serverless/many-instance deployments.
5. **CommonJS vs ESM decision** — pick ESM (`"type": "module"`) deliberately and be able to say why, rather than defaulting to whatever `npx express-generator` gives you.
6. **Job queues (BullMQ)** — called out above in Phase 8, but worth repeating: this is one of the more distinctly "Node" skills that doesn't map cleanly onto the Java roadmap and is genuinely valued.
7. **Idempotency keys on write endpoints** — especially relevant given this is a *finance* app; a duplicate POST from a retried request shouldn't create two transactions. Good thing to implement and explain.

---

## Suggested Minimum Viable Portfolio Version (same logic as your Java plan)

1. Phase 1 — Auth
2. Phase 2 — Accounts + ownership
3. Phase 3 — Categories
4. Phase 4 — Transactions + hand-rolled optimistic locking + `Decimal` (most important, most interview-worthy)
5. Phase 5 — Testing (Jest + Supertest + Testcontainers)
6. Phase 6 — Budgets + basic aggregation
7. Phase 9 — Basic RBAC + rate limiting + helmet
8. Phase 10 — OpenAPI docs + strong README

Same as the Java version: depth on Phases 1–6 + 9 beats shallow coverage of everything.

---

## Final Notes

- You are not starting from zero — you already own this architecture from the Java version. This project is a *port*, not a redesign. Let that speed you up.
- The optimistic locking implementation (Phase 4) is your strongest talking point precisely *because* Prisma doesn't hand it to you the way Spring's `@Version` does — you'll understand it at a deeper level than someone who just added an annotation.
- Once Phase 1+2 are done and genuinely yours (not copied from a tutorial), it's honest to say "fullstack" on your CV. Not before.
- Keep the Java project running in parallel, at whatever pace fits — it becomes your longer-horizon differentiator once this Node project has already gotten you back into fullstack contract conversations.
