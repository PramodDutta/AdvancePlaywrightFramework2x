/**
 * Fresh fixture-driven checkout example.
 *
 * Playwright creates only the fixture requested by a test, plus its
 * dependencies. The setup chain is:
 *
 *   invalidLogin                         (independent negative state)
 *   validLogin
 *      └── loginWithInventory
 *             └── loginWithSelectedItem
 */

import { test, expect } from '@fixtures/test-base';
import { createLogger } from '@utils/logger';
import { visualStep } from '@utils/visualStep';

const customer = {
    firstName: 'Fixture',
    lastName: 'Checkout',
    postalCode: '560001',
};

const log = createLogger('e2e-checkout-new-fixture');

test.describe('@FixtureExample Login and checkout states', () => {
    test('should reject an invalid login fixture', async ({ invalidLogin }) => {
        log.info(`Invalid login fixture verified for ${invalidLogin.username}`);
        expect(invalidLogin.loginPage).toBeDefined();
    });

    test('should complete checkout with a preselected item fixture', async ({
        page,
        loginWithSelectedItem,
        cartPage,
        checkoutStepOnePage,
        checkoutStepTwoPage,
        checkoutCompletePage,
    }) => {
        log.info(`Fixture selected item "${loginWithSelectedItem.itemId}"`);

        await visualStep(page, 'Open the cart', async () => {
            await cartPage.open();
            expect(await cartPage.rowCount()).toBe(1);
        });

        await visualStep(page, 'Fill checkout details', async () => {
            await cartPage.checkout();
            await checkoutStepOnePage.assertLoaded();
            await checkoutStepOnePage.fillGuest(customer);
            await checkoutStepOnePage.continue();
        });

        await visualStep(page, 'Finish the order', async () => {
            await checkoutStepTwoPage.assertLoaded();
            await checkoutStepTwoPage.finish();
        });

        await visualStep(page, 'Verify order completion', async () => {
            await checkoutCompletePage.assertOrderComplete();
        });
    });
});
