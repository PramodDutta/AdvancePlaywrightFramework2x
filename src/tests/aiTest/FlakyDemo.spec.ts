import { test, expect } from '@playwright/test';
import { nthRun } from './demoState';

/**
 * Flakiness demo: 10 tests, 7 rock solid and 3 that pass on odd-numbered runs
 * and fail on even-numbered ones.
 *
 * Run it twice. The first run is all green, the second turns those 3 red, and
 * the reporter's build-to-build diff reports exactly those 3 as flaky, with an
 * AI summary of what they have in common.
 *
 *   npx ts-node -e "require('./src/tests/aiTest/demoState').resetDemoState()"
 *   AI_DEMO=1 npx playwright test --project=ai FlakyDemo   # run 1: 10 pass
 *   AI_DEMO=1 npx playwright test --project=ai FlakyDemo   # run 2: 7 pass, 3 fail
 *
 * Gated behind AI_DEMO because a test designed to fail must never turn the real
 * suite red.
 */
test.describe('@ai @demo Flakiness demo', () => {
    test.skip(!process.env.AI_DEMO, 'Demo of deliberate flakiness. Set AI_DEMO=1 to run.');

    // Seven stable tests. These must never flip, or the diff proves nothing.
    for (let i = 1; i <= 7; i++) {
        test(`stable test ${i} - always passes`, async () => {
            expect(i).toBeLessThanOrEqual(7);
        });
    }

    // Three flaky tests, each failing for a different, realistic-looking reason.
    test('flaky: booking search returns stale results', async () => {
        const run = nthRun('flaky-search');
        expect(run % 2, `search index was stale on run ${run}`).toBe(1);
    });

    test('flaky: auth token expires mid-run', async () => {
        const run = nthRun('flaky-token');
        expect(run % 2, `token rejected with 403 on run ${run}`).toBe(1);
    });

    test('flaky: checkout total races the cart update', async () => {
        const run = nthRun('flaky-race');
        expect(run % 2, `cart total read before update landed on run ${run}`).toBe(1);
    });
});
