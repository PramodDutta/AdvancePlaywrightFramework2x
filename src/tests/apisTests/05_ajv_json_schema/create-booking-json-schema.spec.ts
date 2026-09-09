import { test } from '@fixtures/booker.fixture';
import createBookingSchema from '@testdata/schemas/create-booking.schema.json';
import { buildBookingFromGenerator } from '@testdata/booking.data';
import { SchemaValidator } from '@utils/SchemaValidator';

test('@P0 @schema Level 5 - POST /booking matches the create-booking schema', async ({ bookingApi }) => {
    const body = await bookingApi.createBooking(buildBookingFromGenerator());
    SchemaValidator.assertValid(createBookingSchema, body, 'POST /booking');
    await bookingApi.deleteBooking(body.bookingid);
});
