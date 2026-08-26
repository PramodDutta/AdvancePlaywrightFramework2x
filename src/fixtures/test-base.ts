// Inbuilt fixtures are already available in this case. 

/**
 * test-base — the project's custom Playwright `test`, pre-wired with a fixture
 * for every TTACart Page Object.
 *
 * Instead of `new LoginPage(page)` in each spec, ask for the page you need and
 * it's handed over already constructed against the test's `page`:
 *
 *   import { test, expect } from '@fixtures/test-base';
 *
 *   test('add to cart', async ({ inventoryPage, cartPage }) => {
 *       await inventoryPage.open();
 *       await inventoryPage.addToCart('tta-bike-light');
 *       await cartPage.open();
 *       expect(await cartPage.rowCount()).toBe(1);
 *   });
 *
 * Plain page-object fixtures hand over constructed objects without navigating.
 * State fixtures (`invalidLogin`, `validLogin`, `loginWithInventory`, and
 * `loginWithSelectedItem`) perform reusable setup only when a test requests one.
 */

import { test as base, expect } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { InventoryPage } from '@pages/InventoryPage';
import { ItemDetailPage } from '@pages/ItemDetailPage';
import { CartPage } from '@pages/CartPage';
import { CheckoutStepOnePage } from '@pages/CheckoutStepOnePage';
import { CheckoutStepTwoPage } from '@pages/CheckoutStepTwoPage';
import { CheckoutCompletePage } from '@pages/CheckoutCompletePage';
import loginTestData from '@testdata/logintestdata.json';

type LoginRecord = {
    username: string;
    password: string;
};

export type InvalidLoginState = {
    loginPage: LoginPage;
    username: string;
};

export type SelectedItemState = {
    inventoryPage: InventoryPage;
    itemId: string;
};

const users = loginTestData as LoginRecord[];
const validUser = users.find(({ username }) => username === 'standard_user');
const invalidUser = users.find(({ username }) => username === 'locked_out_user');
const SELECTED_ITEM_ID = 'test-allthethings-tshirt-red';

if (!validUser || !invalidUser) {
    throw new Error('Required standard_user and locked_out_user test data is missing');
}

export type TestFixture = {

    // Page Objects
    loginPage: LoginPage;
    inventoryPage: InventoryPage;
    itemDetailPage: ItemDetailPage;
    cartPage: CartPage;
    checkoutStepOnePage: CheckoutStepOnePage;
    checkoutStepTwoPage: CheckoutStepTwoPage;
    checkoutCompletePage: CheckoutCompletePage;

    // Ready-to-use application states
    invalidLogin: InvalidLoginState;
    validLogin: LoginPage;
    loginWithInventory: InventoryPage;
    loginWithSelectedItem: SelectedItemState;
};

export const test = base.extend<TestFixture>({

    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },
    inventoryPage: async ({ page }, use) => {
        await use(new InventoryPage(page));
    },
    itemDetailPage: async ({ page }, use) => {
        await use(new ItemDetailPage(page));
    },
    cartPage: async ({ page }, use) => {
        await use(new CartPage(page));
    },
    checkoutStepOnePage: async ({ page }, use) => {
        await use(new CheckoutStepOnePage(page));
    },
    checkoutStepTwoPage: async ({ page }, use) => {
        await use(new CheckoutStepTwoPage(page));
    },
    checkoutCompletePage: async ({ page }, use) => {
        await use(new CheckoutCompletePage(page));
    },

    // Independent negative state: the locked-out account remains on login.
    invalidLogin: async ({ page, loginPage }, use) => {
        await loginPage.open();
        await loginPage.loginAs(invalidUser.username, invalidUser.password);
        await expect(page.locator('[data-test="error"]')).toBeVisible();
        await use({ loginPage, username: invalidUser.username });
    },

    // Successful authentication state.
    validLogin: async ({ loginPage }, use) => {
        await loginPage.open();
        await loginPage.loginAs(validUser.username, validUser.password);
        await loginPage.waitForLoginButtonHidden();
        await use(loginPage);
    },

    // Depends on validLogin and guarantees that inventory is loaded.
    loginWithInventory: async ({ validLogin, inventoryPage }, use) => {
        void validLogin;
        await inventoryPage.assertLoaded();
        await use(inventoryPage);
    },

    // Depends on inventory and guarantees that one item is in the cart.
    loginWithSelectedItem: async ({ loginWithInventory }, use) => {
        await loginWithInventory.addToCart(SELECTED_ITEM_ID);
        await use({
            inventoryPage: loginWithInventory,
            itemId: SELECTED_ITEM_ID,
        });
    },
    
});

export { expect };
