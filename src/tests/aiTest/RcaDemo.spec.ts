import { test, expect } from '@fixtures/booker.fixture';
import { buildBookingFromGenerator } from '@testdata/booking.data';

/**
 * RCA demo: one passing test and one that genuinely fails, so the reporter has
 * a real failure (real assertion, real stack) to send to the RCA agent.
 *
 *   AI_DEMO=1 npx playwright test --project=ai RcaDemo
 *
 * The AI Verdict tab then shows severity, priority, root cause and fixes.
 * Gated behind AI_DEMO: a deliberate failure must not turn the real suite red.
 */
test.describe('@ai @demo RCA demo', () => {
    test.skip(!process.env.AI_DEMO, 'Contains a deliberate failure. Set AI_DEMO=1 to run.');

    test('passing: a created booking echoes the name it was sent', async ({ bookingApi }) => {
        const payload = buildBookingFromGenerator({ firstname: 'Rca', lastname: 'Control' });
        const { bookingid, booking } = await bookingApi.createBooking(payload);

        expect(booking.firstname).toBe('Rca');
        await bookingApi.deleteBooking(bookingid);
    });

    test('failing: booking total is asserted against the wrong currency unit', async ({ bookingApi }) => {
        // The bug this imitates: the test asserts pence while the API returns pounds.
        // A real mistake, so the agent has something specific to diagnose.
        const payload = buildBookingFromGenerator({ firstname: 'Rca', totalprice: 250 });
        const { bookingid, booking } = await bookingApi.createBooking(payload);

        try {
            expect(booking.totalprice, 'totalprice should be in pence').toBe(25000);
        } finally {
            await bookingApi.deleteBooking(bookingid).catch(() => undefined);
        }
    });
});
