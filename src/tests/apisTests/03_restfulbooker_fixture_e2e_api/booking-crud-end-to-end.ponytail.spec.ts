import { test, expect } from '@fixtures/booker.fixture';
import { buildBookingFromGenerator } from '@testdata/booking.data';

test.describe.serial('@e2e @P0 Level 3 - Booking lifecycle (token from fixture)', () => {
    let bookingId: number;

    test('create a booking', async ({ bookingApi }) => {
        const { bookingid, booking } = await bookingApi.createBooking(
            buildBookingFromGenerator({ firstname: 'E2E', lastname: 'Journey' }),
        );

        expect(bookingid).toBeGreaterThan(0);
        expect(booking.firstname).toBe('E2E');
        bookingId = bookingid;
    });

    test('update the booking, then read it back', async ({ bookingApi }) => {
        // No token argument: BookingApi re-auths on a 403 and retries. Passing one opts out.
        const updated = await bookingApi.updateBooking(
            bookingId,
            buildBookingFromGenerator({ firstname: 'E2E', lastname: 'Updated', totalprice: 950 }),
        );
        expect(updated).toMatchObject({ lastname: 'Updated', totalprice: 950 });

        // The GET, not the PUT echo, is what proves it persisted.
        expect((await bookingApi.getBooking(bookingId)).lastname).toBe('Updated');
    });

    test('delete the booking and confirm it is gone', async ({ bookingApi }) => {
        expect(await bookingApi.deleteBooking(bookingId)).toBe(201); // booker returns 201, not 204
        expect((await bookingApi.getBookingResponse(bookingId)).status()).toBe(404);
    });
});
