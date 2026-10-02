# NivrāaCare Pricing API

A lightweight, deterministic pricing web service for NivrāaCare. It converts the approved pricing model into a reusable API for WhatsApp, web/mobile apps, the Ops dashboard, and future partner integrations.

## Architecture

```text
HTTP API
  -> Zod validation + API authentication
  -> PricingApplicationService
  -> pure calculateQuote() engine
  -> PricingConfigRepository
  -> Global Pricing Config + Service Master
```

Version 1 is intentionally stateless and uses TypeScript configuration files. The repository interface allows configuration to move to PostgreSQL/Supabase later without rewriting the pricing engine.

## Approved pricing formula

1. `billable_hours = MAX(selected_hours, minimum_billable_hours)`
2. `effective_hourly_rate = base_hourly_rate × service_multiplier`
3. `service_time_charge = billable_hours × effective_hourly_rate`
4. `standard_care_charge = service_time_charge + care_coordination_fee`
5. `care_charge_before_credits = authorized_override ?? standard_care_charge`
6. `credit_discount_applied = MIN(requested_credit, max_credit_discount, care_charge_before_credits)`
7. `final_care_charge = care_charge_before_credits - credit_discount_applied`
8. `transport_total = cab_fare + transport_coordination_fee` only when NivrāaCare arranges transport
9. `total_customer_payable = final_care_charge + transport_total`
10. `credits_earned = FLOOR(final_care_charge × credit_earn_rate / credit_value)`

There is no active first-tier / second-tier / ₹269 extended-hour pricing.

## Current master configuration

- Base hourly rate: ₹299
- Minimum billable hours: 2
- Care coordination fee: ₹199
- Internal GST planning assumption: 18%
- Transport coordination fee: ₹149
- Default operational cab estimate: ₹500
- NivrāaCredit program: enabled
- NivrāaCredit earn rate: 5%
- 1 NivrāaCredit = ₹1
- Maximum redemption: 20% of eligible care price
- Expected redemption assumption: 70% (internal CFO planning only)
- Credit expiry policy: 180 days

## NivrāaCredit rules

- Redemption applies only to care price, never transport/pass-through charges.
- Credits are earned only on `final_care_charge`, after redeemed Credits are removed.
- Transport does not earn Credits.
- Credits are always rounded down with `FLOOR()`.
- The quote API calculates projected Credits; it does not mutate a wallet.
- Actual issuance should happen only after `JOURNEY_COMPLETED` in a future idempotent Credit ledger workflow.
- The 70% expected redemption rate is internal CFO economics only and never changes customer pricing or Credits earned.

Example: ₹1,674 final care × 5% / ₹1 = 83.70 raw Credits => 83 Credits.

## Endpoints

### `GET /health`
Public health check.

### `GET /api/v1/services`
Requires `X-API-Key`. Returns active customer-safe service metadata; multipliers are deliberately not exposed.

### `POST /api/v1/pricing/quote`
Requires `X-API-Key`.

Example request:

```json
{
  "service_code": "HOSPITAL_VISIT",
  "selected_hours": 5,
  "transport_required": true,
  "estimated_cab_fare": 500,
  "nivraa_credit_discount_rupees": 20
}
```

Important result:

```json
{
  "care_charge_before_credits": 1694,
  "credit_discount_applied": 20,
  "final_care_charge": 1674,
  "transport_total": 649,
  "total_customer_payable": 2323,
  "raw_credits_earned": 83.7,
  "nivraa_credits_earned": 83,
  "pricing_status": "VALID"
}
```

## Founder/admin override

An override is intentionally harder to invoke than a normal quote.

The request must include both:

```json
{
  "price_override_rupees": 1800,
  "override_reason": "Founder-approved service price"
}
```

and the caller must send `X-Admin-API-Key` in addition to the normal `X-API-Key`.

The public frontend must never be allowed to submit base rates, multipliers, coordination fees, Credit rates, or redemption percentages.

## Local setup

Requires Node.js 20+.

```bash
cp .env.example .env
npm install
npm test
npm run build
npm run dev
```

Check:

```bash
curl http://localhost:3000/health
```

Quote:

```bash
curl -X POST http://localhost:3000/api/v1/pricing/quote \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "service_code": "HOSPITAL_VISIT",
    "selected_hours": 5,
    "transport_required": true,
    "estimated_cab_fare": 500,
    "nivraa_credit_discount_rupees": 20
  }'
```

Swagger UI is available at `/docs` in non-production when `ENABLE_DOCS=true`.

## Environment variables

```text
NODE_ENV=development
PORT=3000
API_KEY=replace_me
ADMIN_API_KEY=replace_me
PRICING_VERSION=2026.10.01
LOG_LEVEL=info
CORS_ORIGIN=
ENABLE_DOCS=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

Generate long random API secrets before deployment. Never commit `.env`.

## Tests

```bash
npm test
```

The suite covers the seven approved reference cases plus:

- founder override authorization
- manual pricing with an authorized override
- invalid/inactive service handling
- duration validation
- transport validation
- Credit program disabled behavior
- exact Credit cap / one-paise boundary tests
- Credit floor behavior
- transport exclusion from Credit earning
- internal expected redemption economics
- Service Master integrity and duplicate-code checks
- API config-injection rejection

## Pricing versioning

Every quote includes `pricing_version` and a `pricing_snapshot`.

When any commercial rule changes—base rate, multiplier, coordination fee, minimum hours, transport fee, or Credit policy:

1. Create a new pricing version such as `2026.10.15`.
2. Update configuration.
3. Add/update tests for the new version.
4. Preserve historical reference tests where applicable.
5. Commit the change to Git.
6. Deploy only after tests and TypeScript build pass.

Never silently change commercial behavior under an existing version.

## How to add a service safely

1. Add a unique stable `serviceCode` to `src/config/serviceMaster.ts`.
2. Add the customer-facing name, category, multiplier, pricing mode, Angel count, active flag, and rationale.
3. Add at least one test for expected pricing behavior.
4. Run `npm test && npm run build`.
5. Publish as a new pricing version if the service changes commercial configuration.

Production integrations should always use `service_code`, never a display name.

## Rollback

Pricing configuration and code are versioned in Git. If a release is wrong:

1. Redeploy the last known-good Git commit.
2. Restore the previous `PRICING_VERSION` with that release.
3. Do not edit historical booking snapshots.
4. Investigate and add a regression test before releasing the fix.

## Render deployment

### First production deployment

1. Push this folder to a private GitHub repository, for example `nivraa-pricing-api`.
2. Run `npm install` locally once and commit the generated `package-lock.json`.
3. In Render create a new **Web Service** from that repository.
4. Use Node runtime.
5. Build command (works before the first lockfile is committed):

```bash
npm install --no-audit --no-fund && npm run test && npm run build
```

After the first successful `npm install`, commit `package-lock.json`. You can then tighten CI/deployment to `npm ci && npm run test && npm run build`.

6. Start command:

```bash
npm start
```

7. Health check path:

```text
/health
```

8. Configure environment variables in Render:

```text
NODE_ENV=production
API_KEY=<strong random secret>
ADMIN_API_KEY=<different strong random secret>
PRICING_VERSION=2026.10.01
LOG_LEVEL=info
ENABLE_DOCS=false
CORS_ORIGIN=<your allowed frontend origin(s)>
```

9. Deploy and verify `/health`, `/api/v1/services`, and the approved ₹2,323 quote.
10. Before real bookings rely on it, use an always-on production instance rather than a development/sleeping tier.

The service listens on `0.0.0.0` and `process.env.PORT`, which is suitable for Render web services.

### Production URL pattern

Render will provide an HTTPS hostname. Later map a custom domain such as:

```text
pricing-api.nivraacare.com
```

Then the quote endpoint is:

```text
POST https://pricing-api.nivraacare.com/api/v1/pricing/quote
```

## Future PostgreSQL/Supabase migration

The engine currently reads configuration from `InMemoryPricingConfigRepository`. Later implement a `PostgresPricingConfigRepository` with the same interface and change dependency wiring only.

Likely tables:

- `pricing_config_versions`
- `service_master`
- `credit_policy`
- `quotes`
- `pricing_snapshots`

Do not move patient PII or medical records into this pricing service. It should remain a narrow pricing domain service.

## Future NivrāaCredit wallet

A separate Credit ledger should eventually own issuance, redemption, reversals, expiry, refunds, wallet balance, and transaction history. This API only determines the commercially allowed redemption and projected Credits earned.
