import { faker } from '@faker-js/faker';
import { DataGenerator } from '@utils/DataGenerator';
import type { Booking } from '../api/BookingApi';

/** Values restful-booker accepts for the optional `additionalneeds` field. */
export const ADDITIONAL_NEEDS = ['Breakfast', 'Late checkout', 'Extra bed'] as const;

function isoDate(daysFromNow: number): string {
    const d = faker.date.soon({ days: daysFromNow, refDate: '2026-01-01T00:00:00.000Z' });
    return d.toISOString().slice(0, 10);
}

export function buildBooking(overrides: Partial<Booking> = {}): Booking {
    return {
        firstname: faker.person.firstName(),
        lastname: faker.person.lastName(),
        totalprice: faker.number.int({ min: 100, max: 1000 }),
        depositpaid: faker.datatype.boolean(),
        bookingdates: {
            checkin: '2026-02-01',
            checkout: isoDate(30),
        },
        additionalneeds: faker.helpers.arrayElement(['Breakfast', 'Late checkout', 'Extra bed']),
        ...overrides,
    };
}

/**
 * Same shape as `buildBooking`, built through `@utils/DataGenerator` instead of
 * calling Faker directly, so every spec draws random data from one utility.
 *
 * Two differences from `buildBooking` that matter when you assert on the dates:
 *   - checkin is relative to today, so a booking never ages into the past.
 *   - checkout is derived from checkin, so checkout is always the later date.
 *
 * @param overrides fields to pin; anything omitted is generated.
 * @param stayNights nights between checkin and checkout (default 3).
 */
export function buildBookingFromGenerator(
    overrides: Partial<Booking> = {},
    stayNights = 3,
): Booking {
    const checkin = DataGenerator.dateOffset(1);

    return {
        firstname: DataGenerator.firstName(),
        lastname: DataGenerator.lastName(),
        totalprice: DataGenerator.number(100, 1000),
        depositpaid: DataGenerator.bool(),
        bookingdates: {
            checkin,
            checkout: DataGenerator.dateOffset(stayNights, new Date(checkin)),
        },
        additionalneeds: DataGenerator.oneOf(ADDITIONAL_NEEDS),
        ...overrides,
    };
}
