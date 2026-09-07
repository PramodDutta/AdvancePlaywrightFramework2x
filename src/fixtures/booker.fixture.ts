import { test as base, expect } from '@playwright/test';
import { BookingApi } from '../api/BookingApi';

export type BookerFixtures = {
    bookingApi: BookingApi;
    bookerToken: string;
};

export const test = base.extend<BookerFixtures>({
    // Build the service object once and hand it to the test.
    bookingApi: async ({ request }, use) => {
        await use(new BookingApi(request));
    },

    // Generate a token via POST /auth and expose it to the test. This is the
    // "token generation lives in a fixture" requirement.
    //
    // A fixture resolves once, before the test body runs, so it cannot react to a
    // token that expires mid-test. That recovery lives in BookingApi.sendAuthed():
    // omit the token argument on a mutating call and it re-auths on a 403 and
    // retries. Use this fixture when you want the token value itself (to log it,
    // to pass it on, or to assert on it).
    bookerToken: async ({ bookingApi }, use) => {
        await use(await bookingApi.getToken());
    },
});

export { expect };
