# Logger Knowledge Base

`logger.ts` provides a shared Winston logger and a `createLogger(scope)` helper for creating child loggers whose messages include a scope label.

## Supported log levels

The logger uses Winston's default npm levels. They are ordered from highest priority (`error`) to lowest priority (`silly`).

| Priority | Level | Typical use | Example |
| ---: | --- | --- | --- |
| 0 | `error` | A failure that prevents an operation from completing | `logger.error('Login failed after all retries');` |
| 1 | `warn` | An unexpected condition that does not stop execution | `logger.warn('Login response was slower than expected');` |
| 2 | `info` | Normal test or framework milestones | `logger.info('Login test started');` |
| 3 | `http` | HTTP request and response activity | `logger.http('POST /api/login returned 200');` |
| 4 | `verbose` | Detailed operational information | `logger.verbose('Waiting for the dashboard redirect');` |
| 5 | `debug` | Diagnostic details useful while troubleshooting | `logger.debug('Login button is visible and enabled');` |
| 6 | `silly` | Extremely detailed trace-style information | `logger.silly('Password field received 12 characters');` |

## Basic usage

Import the shared logger when the message does not need a component label:

```ts
import logger from './logger';

logger.error('Unable to complete login');
logger.warn('Using fallback test credentials');
logger.info('Login completed successfully');
logger.http('POST /api/login returned 200');
logger.verbose('Waiting for navigation to settle');
logger.debug('Submit button is enabled');
logger.silly('Login form validation cycle completed');
```

The named import is equivalent:

```ts
import { logger } from './logger';

logger.info('Test execution started');
```

## Scoped logger

Use `createLogger(scope)` when every message should identify its source. A page object can use its class name as the scope:

```ts
import { createLogger } from './logger';

const log = createLogger('LoginPage');

log.info('Submitting login form');
log.debug('Login button is visible');
log.error('Dashboard did not load');
```

An emitted line follows this format:

```text
2026-06-02 07:40:01 [info] [LoginPage] Submitting login form
```

## Selecting the active level

Set `LOG_LEVEL` before starting Playwright:

```bash
LOG_LEVEL=debug npx playwright test src/tests/login/login.spec.ts
```

If `LOG_LEVEL` is not set, the logger defaults to `info`. Winston includes the selected level and every higher-priority level. For example:

- `LOG_LEVEL=info` emits `info`, `warn`, and `error`.
- `LOG_LEVEL=debug` emits `debug`, `verbose`, `http`, `info`, `warn`, and `error`.
- `LOG_LEVEL=silly` emits every supported level.

## Output destinations

Every emitted message goes to both destinations configured in `logger.ts`:

- The console, with a colorized level.
- `logs/combined.log`, as plain text for CI artifacts and later inspection.

Each line includes a timestamp in `YYYY-MM-DD HH:mm:ss` format. Scoped loggers also include `[scope]` after the level.
