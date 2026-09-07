import { test, expect } from '@fixtures/booker.fixture';
import { buildBookingFromGenerator } from '@testdata/booking.data';
import type { BookingApi } from '../../../api/BookingApi';

/**
 * Statuses below were verified against the live API. restful-booker does not
 * return what you would guess: a bad token is 403 (not 401), a malformed payload
 * is 500 (not 400), and bad credentials come back 200 with { reason }.
 *
 * The raw *Response() methods are used so the status can be asserted directly,
 * instead of the service object converting it into a thrown error.
 */
const REJECTIONS: [name: string, call: (api: BookingApi) => Promise<{ status(): number }>, status: number][] = [
    ['GET unknown id -> 404', (api) => api.getBookingResponse(99_999_999), 404],
    ['GET non-numeric id -> 404', (api) => api.getBookingResponse('abc' as unknown as number), 404],
    ['POST partial payload -> 500', (api) => api.createBookingResponse({ firstname: 'X' }), 500],
    ['POST empty body -> 500', (api) => api.createBookingResponse({}), 500],
];

test.describe('@negative @P0 Level 3 - Booking negative paths', () => {
    for (const [name, call, status] of REJECTIONS) {
        test(name, async ({ bookingApi }) => {
            expect((await call(bookingApi)).status()).toBe(status);
        });
    }

    test('typed methods throw instead of returning a Booking-shaped lie', async ({ bookingApi }) => {
        await expect(bookingApi.getBooking(99_999_999)).rejects.toThrow(/failed: 404/);
        // Status is 200 here; only the body reveals the failure.
        await expect(bookingApi.auth('wrong', 'wrong')).rejects.toThrow(/Reason: Bad credentials/);
    });

    test('PUT with an invalid token is forbidden and changes nothing', async ({ bookingApi }) => {
        const { bookingid } = await bookingApi.createBooking(buildBookingFromGenerator());

        // An explicit token opts out of auto-renewal, which keeps this assertion honest.
        const response = await bookingApi.updateBookingResponse(
            bookingid,
            buildBookingFromGenerator({ firstname: 'ShouldNotStick' }),
            'not-a-real-token',
        );
        expect(response.status()).toBe(403);

        // Asserting the status is only half a negative test: prove nothing was written.
        expect((await bookingApi.getBooking(bookingid)).firstname).not.toBe('ShouldNotStick');
        await bookingApi.deleteBooking(bookingid);
    });
});
