import { test, expect } from '@playwright/test';
import { healLocator, isLocatorFailure } from '@utils/selfHeal';
import { LoginPage } from '@pages/LoginPage';

/**
 * Self-healing demo.
 *
 * `[data-test="user-name"]` is a realistic near-miss: the real attribute on the
 * login page is `username`. The locator times out, the agent is shown the
 * elements actually present, and every suggestion is re-run against the live
 * page before it reaches the report.
 *
 *   AI_DEMO=1 npx playwright test --project=chromium SelfHealDemo
 *
 * The test still fails, on purpose. Healing reports a repair; it does not
 * pretend the run was fine.
 */
test.describe('@ai @demo Self-healing locators', () => {
    test.skip(!process.env.AI_DEMO, 'Contains a deliberate locator failure. Set AI_DEMO=1 to run.');

    test('suggests a replacement for a dead login locator', async ({ page }, testInfo) => {
        // This project's baseURL is the API host, so the UI page is explicit.
        const ui = process.env.QA_BASE_URL || 'https://app.thetestingacademy.com';
        await page.goto(`${ui}${LoginPage.PATH}`);

        const DEAD = '[data-test="user-name"]';   // real attribute is "username"
        const INTENT = 'the username input on the login form';

        try {
            await page.locator(DEAD).fill('standard_user', { timeout: 5_000 });
        } catch (error) {
            if (!isLocatorFailure(error)) throw error;

            // The page is still open here, which is the only moment the DOM
            // exists to check candidates against. The reporter runs too late.
            // `requires: 'editable'` is the difference between a suggestion and
            // a usable one: the page has headings that match uniquely too.
            const report = await healLocator(page, DEAD, INTENT, { requires: 'editable' });

            await testInfo.attach('self-heal', {
                body: JSON.stringify(report, null, 2),
                contentType: 'application/json',
            });

            // Assert on the verification, never on the model's wording.
            expect(report.verified.length, 'at least one candidate should resolve to one element').toBeGreaterThan(0);
            expect(report.verified[0].matchCount).toBe(1);

            // Prove the suggestion is usable, not merely well-formed.
            await page.locator(report.verified[0].selector).fill('standard_user');
            await expect(page.locator(report.verified[0].selector)).toHaveValue('standard_user');
        }
    });
});
