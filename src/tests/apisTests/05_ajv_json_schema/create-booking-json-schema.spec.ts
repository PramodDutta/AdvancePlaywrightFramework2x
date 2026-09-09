import { test } from '@fixtures/booker.fixture';
import createBookingSchema from '@testdata/schemas/create-booking.schema.json';
import { buildBookingFromGenerator } from '@testdata/booking.data';
import { SchemaValidator } from '@utils/SchemaValidator';
import { createLogger } from '@utils/logger';

const log = createLogger('create-booking-schema');

test.describe('@P0 @schema Level 5 - Create booking JSON schema (Ajv)', () => {
    test('the POST /booking response matches the create-booking schema', async ({ bookingApi }, testInfo) => {
        const body = await bookingApi.createBooking(buildBookingFromGenerator());

        await testInfo.attach('create-booking-response', {
            body: JSON.stringify(body, null, 2),
            contentType: 'application/json',
        });

        log.info(`Validating POST /booking response for id ${body.bookingid}`);
        SchemaValidator.assertValid(createBookingSchema, body, 'POST /booking');

        await bookingApi.deleteBooking(body.bookingid);
    });
});
