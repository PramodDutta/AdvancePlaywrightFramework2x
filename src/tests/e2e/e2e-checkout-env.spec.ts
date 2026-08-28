/**
 * E2E checkout driven entirely by `.env`, read through @config/env.
 * Required: STANDARD_USER, TTA_SECRET, CHECKOUT_ITEM_ID
 * Optional: CHECKOUT_FIRST_NAME, CHECKOUT_LAST_NAME, CHECKOUT_POSTAL_CODE (else Faker)
 * Non-env twin of this spec: e2e-checkout.spec.ts
 */

import { test, expect } from '@fixtures/test-base';
import { assertEnv, requireEnv } from '@config/env';
import { credentials } from '@config/credentials';
import { DataGenerator } from '@utils/DataGenerator';
import { createLogger } from '@utils/logger';
import { visualStep } from '@utils/visualStep';

const log = createLogger('e2e-checkout-env');

// Resolved at load time so an incomplete .env fails the file, not a step midway.
assertEnv('STANDARD_USER', 'TTA_SECRET');
const ITEM_ID = requireEnv('CHECKOUT_ITEM_ID');

test.describe('@P0 @Regression E2E @Checkout Checkout Feature (env-driven)', () => {
    test.beforeEach(async ({ loginPage }) => {
        log.info(`Step 1: logging in as ${credentials.standardUser} (from .env)`);
        await loginPage.open();
        await loginPage.loginAs(credentials.standardUser, credentials.password);
    });

    test('should complete checkout successfully using .env data', async ({
        page,
        inventoryPage,
        cartPage,
        checkoutStepOnePage,
        checkoutStepTwoPage,
        checkoutCompletePage,
    }) => {
        const customer = DataGenerator.checkoutCustomerFromEnv();
        log.info(`Env config: item="${ITEM_ID}", customer="${customer.firstName} ${customer.lastName}", postalCode="${customer.postalCode}"`);

        await visualStep(page, 'Go to the inventory page', async () => {
            log.info('Step 2: navigating to the inventory page');
            await inventoryPage.open();
        });

        await visualStep(page, `Add "${ITEM_ID}" to the cart`, async () => {
            log.info(`Step 3: adding item "${ITEM_ID}" to the cart`);
            await inventoryPage.addToCart(ITEM_ID);
        });

        await visualStep(page, 'Open the cart', async () => {
            log.info('Step 4: opening the cart and verifying one row');
            await cartPage.open();
            expect(await cartPage.rowCount()).toBe(1);
        });

        await visualStep(page, 'Fill guest details (checkout step one)', async () => {
            log.info(`Step 5a: filling guest details for ${customer.firstName} ${customer.lastName}`);
            await cartPage.checkout();
            await checkoutStepOnePage.assertLoaded();
            await checkoutStepOnePage.fillGuest(customer);
            await checkoutStepOnePage.continue();
        });

        await visualStep(page, 'Finish the order (checkout step two)', async () => {
            log.info('Step 5b: reviewing the overview and finishing the order');
            await checkoutStepTwoPage.assertLoaded();
            await checkoutStepTwoPage.finish();
        });

        await visualStep(page, 'Order is complete', async () => {
            log.info('Step 6: asserting the order is complete');
            await checkoutCompletePage.assertOrderComplete();
        });
    });
});
