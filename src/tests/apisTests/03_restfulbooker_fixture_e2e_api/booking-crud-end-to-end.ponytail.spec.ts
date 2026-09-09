import { test, expect } from '@fixtures/booker.fixture';
import { buildBookingFromGenerator } from '@testdata/booking.data';

test('@e2e @P0 Level 3 - Booking lifecycle (create, update, read back, delete)', async ({
    bookingApi,
}) => {
    const { bookingid, booking } = await bookingApi.createBooking(
        buildBookingFromGenerator({ firstname: 'E2E', lastname: 'Journey' }),
    );
    expect(booking.firstname).toBe('E2E');

    // No token argument: BookingApi re-auths on a 403 and retries. Passing one opts out.
    const updated = await bookingApi.updateBooking(
        bookingid,
        buildBookingFromGenerator({ firstname: 'E2E', lastname: 'Updated', totalprice: 950 }),
    );
    expect(updated).toMatchObject({ lastname: 'Updated', totalprice: 950 });

    // The GET, not the PUT echo, is what proves it persisted.
    expect((await bookingApi.getBooking(bookingid)).lastname).toBe('Updated');

    expect(await bookingApi.deleteBooking(bookingid)).toBe(201); // booker returns 201, not 204
    expect((await bookingApi.getBookingResponse(bookingid)).status()).toBe(404);
});
