import { test, expect } from '@fixtures/booker.fixture';
import { dataGenAgent, toApiPayload, type GeneratedBooking } from '../../ai/agents/dataGenAgent';
import { describeProvider, hasApiKey } from '../../ai/config/providers';
import bookingSchema from '@testdata/schemas/ai-booking-payload.schema.json';
import { SchemaValidator } from '@utils/SchemaValidator';
import { createLogger } from '@utils/logger';

const log = createLogger('ai-data-gen');

/**
 * Level AI-01 - the custom data generator.
 *
 * The model proposes payloads; the schema and the API decide whether they are
 * good. Nothing here asserts on generated prose, so a bad sample fails on a
 * schema violation or an HTTP status, never on a sampled token.
 *
 * With no key the whole file skips. That is the CI path, and it is normal.
 */
test.describe('@ai @P1 Level AI-01 - Custom data generator', () => {
    test.skip(!hasApiKey(), 'No LLM key configured: set DEEPSEEK_API_KEY in .env');

    test('generates booking payloads the API accepts', async ({ bookingApi }, testInfo) => {
        log.info(`Requesting 3 bookings from ${describeProvider()}`);

        const result = await dataGenAgent.run({
            count: 3,
            focus: 'edge cases around price and stay length',
        });

        // A key was present, so an unavailable result is a real failure here.
        if (!result.available) {
            throw new Error(`Data generator unavailable: ${result.reason}`);
        }

        log.info(`${result.provider} returned ${result.data.bookings.length} rows in ${result.latencyMs}ms`);

        // The factory already validated, so this is a guard against the factory
        // itself regressing, not a repeat of its work.
        expect(SchemaValidator.validate(bookingSchema, result.data).valid).toBe(true);
        expect(result.data.bookings.length).toBe(3);

        await testInfo.attach('ai-data', {
            body: JSON.stringify(
                { agent: 'data-generator', provider: result.provider, latencyMs: result.latencyMs, ...result.data },
                null,
                2,
            ),
            contentType: 'application/json',
        });

        const created: number[] = [];
        try {
            for (const booking of result.data.bookings as GeneratedBooking[]) {
                await test.step(`POST /booking - ${booking.scenario}`, async () => {
                    // Dates are the field a model most often gets wrong, and the
                    // API will not catch a reversed stay, so assert it here.
                    expect(booking.bookingdates.checkout > booking.bookingdates.checkin).toBe(true);

                    const response = await bookingApi.createBookingResponse(toApiPayload(booking));
                    expect(response.status()).toBe(200);

                    const body = await response.json() as { bookingid: number };
                    expect(body.bookingid).toBeGreaterThan(0);
                    created.push(body.bookingid);
                    log.info(`Created ${body.bookingid} for scenario "${booking.scenario}"`);
                });
            }
        } finally {
            for (const id of created) {
                await bookingApi.deleteBooking(id).catch(() => undefined);
            }
        }
    });
});
