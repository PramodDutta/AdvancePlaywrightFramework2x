import { DataGenerator } from '@utils/DataGenerator';
import type { Booking } from '../api/BookingApi';

/** Values restful-booker accepts for the optional `additionalneeds` field. */
export const ADDITIONAL_NEEDS = ['Breakfast', 'Late checkout', 'Extra bed'] as const;

/**
 * Fixed check-in date. `jsonpath-queries.e2e.spec.ts` asserts on this literal to
 * show a deep JSONPath read returning a known value, so it must stay stable.
 */
export const PINNED_CHECKIN = '2026-02-01';

/**
 * A random booking, built entirely through `@utils/DataGenerator` so every spec
 * draws its randomness from one utility.
 *
 * Check-out is derived from check-in, so the stay is always in the right order,
 * and check-in is relative to today, so a booking never ages into the past.
 *
 * @param overrides fields to pin; anything omitted is generated.
 * @param stayNights nights between check-in and check-out (default 3).
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

/**
 * Same as `buildBookingFromGenerator`, but with check-in pinned to
 * {@link PINNED_CHECKIN} for specs that assert on a known date.
 */
export function buildBooking(overrides: Partial<Booking> = {}, stayNights = 3): Booking {
    return buildBookingFromGenerator(
        {
            bookingdates: {
                checkin: PINNED_CHECKIN,
                checkout: DataGenerator.dateOffset(stayNights, new Date(PINNED_CHECKIN)),
            },
            ...overrides,
        },
        stayNights,
    );
}
