# Novus Pulse — Agentic CMS Rebuild

Forked from the "quick admin panel" (`cms/`, kept as-is). This app + a new
`agent` module in the NestJS backend become the agentic CMS.

## Vision
AI agents are first-class operators of the CMS. You describe an outcome in
plain language and an agent performs real operations through a typed **tool
registry** (create/edit/publish content, manage SEO, media, taxonomy, forms,
scheduling) — with a **human-in-the-loop approval gate** and a full **audit
trail**. The manual dashboard stays as the preview/approval + fallback surface.

## Modes — gated by tenant `plan` (`starter | studio | agency`)
| Plan     | Mode        | Behavior |
|----------|-------------|----------|
| starter  | **Copilot** | Agent proposes; human applies every change. (today's propose/apply, generalized) |
| studio   | **Agent**   | Agent executes read-only tools freely; mutations require one approval click. |
| agency   | **Autonomous** | Scheduled/triggered agents run themselves; results land in an approval queue. |

The mode is also overridable per-request (a starter user can still just chat;
an agency user can require approval for a sensitive run).

## Architecture
- **Backend (NestJS — evolve, don't rewrite):** new `src/agent/` module
  - `AgentRuntime` — multi-turn tool-calling loop over the Anthropic SDK.
  - `ToolRegistry` — typed tools that wrap the *existing* services
    (`PagesService`, `PhotosService`, `FormsService`, `MenusService`, …).
  - **Approval gate** — mutating tool calls pause for human approval unless
    plan + policy auto-approves.
  - **Audit** — `AgentRun` + `AgentAction` entities (generalize
    `content-change-log`, which stays for field-level diffs).
  - **Plan guard** — entitlements per mode.
- **Frontend (this app):** chat surface + streaming + approval cards; the
  existing dashboard pages become the "preview" the agent's changes show up in.
- **Provider:** extend `AiProvider` with tool-use (the current `proposeChanges`
  becomes one narrow capability; the runtime adds general tool calling).

## Tool registry (grows over phases)
Each tool = `{ name, description, inputSchema (JSON), plan, mutates, handler(ctx, input) }`.
`ctx` carries `tenantId` + `user` **injected from the request** — never from the model.
- **Pages:** create · update · publish · unpublish · softDelete · list · restoreRevision
- **SEO:** setSeo(title, description, ogImage, canonical) per item
- **Media:** upload · list · setAltText · organize(folder)
- **Taxonomy:** category/tag CRUD + assign (real entities, not `Page.type`)
- **Forms:** listSubmissions · export · respond
- **Menus:** edit
- **Scheduling:** schedulePublish(at)
- **Site:** redirects · sitemap/robots

## Domain gaps to fix (foundation, phased in)
Real content-type/schema system · real taxonomy · first-class SEO columns ·
`scheduledAt` · `deletedAt` soft-delete + trash · agent audit log · redirects ·
sitemap/robots · granular per-tenant roles/permissions.

## Safety (non-negotiable)
- Mutating tools always route through the approval gate unless plan+policy auto-approves.
- Every tool call is audited (`AgentRun` / `AgentAction`).
- Tenant isolation reuses the global `TenantGuard`; **tools never accept a
  tenantId from the model** — it's injected from the authenticated request.
- Read-only tools run without approval.

## Phases
- **P0 (done):** fork + save admin panel.
- **P1 (in progress):** backend agent foundation — runtime + registry + first
  Pages tools (list/create/publish) + approval gate + audit entities. Curl-testable.
- **P2:** frontend chat + approval UI → first end-to-end vertical slice, demoable.
- **P3:** domain foundation — SEO columns, `scheduledAt`, soft-delete, real taxonomy.
- **P4:** broaden tool registry — media, forms, menus, SEO, scheduling.
- **P5:** autonomous mode (agency) — scheduled/triggered runs + approval queue.
- **P6:** content-type builder, redirects, sitemap, granular permissions.
