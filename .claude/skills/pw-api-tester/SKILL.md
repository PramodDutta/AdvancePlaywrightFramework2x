---
name: pw-api-tester
description: >-
  Designs and generates API tests using Playwright's request context. Use when an
  SDET says "write API tests for this endpoint", "test the /orders API", "add
  schema validation for this response", "cover the negative cases", or pastes an
  OpenAPI/endpoint spec. Produces happy-path, schema-validation, auth, and
  negative/boundary tests — a draft the engineer runs against a real service.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 1.1.0-ttacart
  adapted-for: AdvancePlaywrightFramework2x
---

# PW API Tester

## Use ajv, not zod
This repo validates response contracts with **`ajv` + `ajv-formats`** and queries payloads with
**`jsonpath-plus`**. All three are in `devDependencies`. Do not introduce zod.

`require('zod')` may succeed on a dev machine anyway, because Node walks up to `~/node_modules`
and can find a stray copy there. That is not a dependency. Trust the project tree, not the import:

```bash
npm ls zod          # "(empty)" means it is not yours to use
```

A test built on a package that resolves only from a home directory passes locally and fails in CI,
the same way a missing `.env` does.

## Where things go
- Request helpers: `src/api/` (currently empty, so you are setting the pattern).
- Schemas: alongside the helper, or `src/testdata/` when shared.
- Specs: `src/tests/api/`.

## Base URL
`playwright.config.ts:resolveBaseURL()` returns `API_BASE_URL` (default
`https://restful-booker.herokuapp.com`) when `TTA_ENV=api`. Read it through `@config/env`; never
hard-code a host.

```bash
TTA_ENV=api npx playwright test src/tests/api/
```

## Workflow
1. Wrap the endpoint in a client class in `src/api/` taking `APIRequestContext`. Give it a scoped logger via `createLogger`, matching the page objects.
2. Cover happy path, schema, auth, and negative/boundary cases. Assert status and body separately so a failure names which one broke.
3. Compile the schema once at module scope, not per test.

## Output shape
```typescript
import Ajv, { type JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import { test, expect } from '@fixtures/test-base';
import { createLogger } from '@utils/logger';

const log = createLogger('booking.api.spec');
const ajv = addFormats(new Ajv({ allErrors: true }));

const bookingSchema = {
    type: 'object',
    required: ['bookingid', 'booking'],
    properties: {
        bookingid: { type: 'integer' },
        booking: {
            type: 'object',
            required: ['firstname', 'lastname', 'totalprice'],
            properties: {
                firstname: { type: 'string' },
                lastname: { type: 'string' },
                totalprice: { type: 'number' },
            },
        },
    },
} as const;

const validateBooking = ajv.compile(bookingSchema as any);

test('@API creates a booking matching the contract', async ({ request }) => {
    const res = await request.post('/booking', { data: { /* ... */ } });
    expect(res.status()).toBe(200);

    const body = await res.json();
    const valid = validateBooking(body);
    // Surface ajv's own errors, otherwise the failure says only "false".
    expect(valid, JSON.stringify(validateBooking.errors, null, 2)).toBe(true);
});
```

## Note
The `request` fixture is Playwright's built-in and is available through `@fixtures/test-base`,
since that module extends the base `test`.
