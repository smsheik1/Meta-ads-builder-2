# Packet 1: Backend and Platform

- Review status: Unverified
- Decision status: No candidate approved

## GLM's proposed candidates

| Candidate | Stack described in the intake | Proposed role |
| --- | --- | --- |
| `get-convex/convex-saas` | TanStack, Convex Auth, Stripe, Resend, Tailwind, shadcn, uploads, i18n, themes, landing/onboarding/dashboard/admin | General SaaS starter |
| `get-convex/ents-saas-starter` | Next.js, Convex, Convex Ents, organizations, teams, roles, and relations | Preferred starter because Wiggly v3 already uses Next.js |

## Capabilities GLM says the starters provide

- Email, social, and anonymous authentication
- Anonymous-to-OAuth ownership transfer
- Stripe subscriptions and customer portal
- Convex file storage and uploads
- Resend email integration
- Realtime database synchronization
- Organizations, teams, roles, and relations in the Ents version
- Landing page, onboarding, dashboard, and admin scaffolding
- Themes, dark mode, and responsive UI

These are source claims, not verified Wiggly requirements or confirmed repository capabilities.

## Claimed direct mappings to the PRD

### Anonymous share fork

GLM maps `/share` → `Edit this ad` to an anonymous Convex user creating a new Player project, with optional ownership transfer if the user later signs in.

### File uploads and storage

GLM maps reference images, product images, PNG exports, and ZIP exports to Convex file storage and authenticated upload actions.

### Format versioning and branching

GLM proposes Convex tables and Ents relations for Format Versions, Format Drafts, Player instances, and overrides.

## GLM's proposed choice

Use `get-convex/ents-saas-starter` because:

- Wiggly v3 already uses Next.js.
- Organizations, teams, roles, and relations could later support creator lineage, public Formats, and team administration.

## Claims reserved for later assessment

- “Backend is approximately zero days.”
- The starter can be adopted without disruptive replacement of Wiggly's existing Convex application.
- Convex Auth already provides the exact anonymous-to-account transfer behavior Wiggly needs.
- Ents provides Format immutability and branching “for free.”
- Billing, email, organizations, and a general dashboard belong in this MVP.

## Information to collect during review

- Exact current repositories and official ownership
- Starter maintenance and dependency versions
- Whether adoption means extracting components or replacing the existing v3 foundation
- Schema, auth, and deployment overlap with current Wiggly Convex code
- Smallest subset that helps the Maker-first MVP
- Data migration and rollback cost
