import { test, expect } from '@fixtures/booker.fixture';
import { buildBookingFromGenerator } from '@testdata/booking.data';
import { createLogger } from '@utils/logger';

const log = createLogger('booking-negative');

/**
 * Negative paths for restful-booker. Every status below was verified against the
 * live API, because this service does not follow the codes you would guess:
 *
 *   - an unknown or expired token is 403 Forbidden, never 401 Unauthorised
 *   - a malformed payload is 500, not 400 Bad Request
 *   - bad credentials come back 200 with { reason: "Bad credentials" }, so the
 *     status code alone will happily tell you the login worked
 *
 * These use the raw *Response() methods so the status can be asserted directly
 * instead of being converted into a thrown error by the service object.
 */
test.describe('@negative @P0 Level 3 - Booking negative paths', () => {
    test('GET /booking/{id} returns 404 for an id that does not exist', async ({ bookingApi }) => {
        const ghostId = 99_999_999;

        const response = await bookingApi.getBookingResponse(ghostId);

        log.info(`GET /booking/${ghostId} responded ${response.status()}`);
        expect(response.status()).toBe(404);
        expect(response.ok()).toBe(false);
    });

    test('GET /booking/{id} returns 404 for a non-numeric id', async ({ bookingApi }) => {
        // Cast because the API is being probed with a deliberately wrong type.
        const response = await bookingApi.getBookingResponse('abc' as unknown as number);

        expect(response.status()).toBe(404);
    });

    test('getBooking() throws rather than returning an empty object on a 404', async ({
        bookingApi,
    }) => {
        // The typed helper must not hand back a Booking-shaped lie. A caller that
        // forgets to check would otherwise assert against undefined fields.
        await expect(bookingApi.getBooking(99_999_999)).rejects.toThrow(
            /GET \/booking\/99999999 failed: 404/,
        );
    });

    test('POST /booking rejects a payload missing required fields', async ({ bookingApi }) => {
        // firstname only: lastname, totalprice, depositpaid and bookingdates are absent.
        const response = await bookingApi.createBookingResponse({ firstname: 'Incomplete' });

        log.info(`POST /booking with a partial payload responded ${response.status()}`);
        // 500, not the 400 a well-behaved API would return.
        expect(response.status()).toBe(500);
        expect(response.ok()).toBe(false);
    });

    test('POST /booking rejects an empty body', async ({ bookingApi }) => {
        const response = await bookingApi.createBookingResponse({});

        expect(response.status()).toBe(500);
    });

    test('PUT /booking/{id} is forbidden when the token is invalid', async ({ bookingApi }) => {
        const { bookingid } = await bookingApi.createBooking(buildBookingFromGenerator());

        // An explicit token is honoured as-is: passing one opts out of the
        // auto-renewal in sendAuthed(), which is what keeps this assertion honest.
        const response = await bookingApi.updateBookingResponse(
            bookingid,
            buildBookingFromGenerator({ firstname: 'ShouldNotStick' }),
            'not-a-real-token',
        );

        log.info(`PUT /booking/${bookingid} with a bad token responded ${response.status()}`);
        expect(response.status()).toBe(403);

        // The booking must be untouched by the rejected write.
        const stored = await bookingApi.getBooking(bookingid);
        expect(stored.firstname).not.toBe('ShouldNotStick');

        await bookingApi.deleteBooking(bookingid);
    });

    test('POST /auth with bad credentials yields no token', async ({ bookingApi }) => {
        // The status here is 200. Only the body reveals the failure, which is why
        // BookingApi.auth() checks for a token instead of trusting isSuccess().
        await expect(bookingApi.auth('wrong-user', 'wrong-password')).rejects.toThrow(
            /no token\. Reason: Bad credentials/,
        );
    });
});
