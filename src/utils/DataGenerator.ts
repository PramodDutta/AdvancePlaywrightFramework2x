/**
 * DataGenerator — Faker-backed fake data for the TTACart project.
 *
 * TTACart is a SauceDemo-style storefront: it needs login credentials and
 * checkout customer info (first name, last name, postal code). This util
 * centralises all random data so tests stay deterministic-friendly (one
 * import) and read naturally.
 *
 * Faker API notes:
 *   - `faker.internet.username()`
 *   - `faker.internet.password({ length })`
 *   - `faker.location.zipCode()`
 */

import { faker } from '@faker-js/faker';
import { envOr } from '@config/env';

export interface Credentials {
    username: string;
    password: string;
}

export interface CheckoutCustomer {
    firstName: string;
    lastName: string;
    postalCode: string;
}

export interface UserProfile extends Credentials, CheckoutCustomer {
    email: string;
    fullName: string;
    phone: string;
}

export class DataGenerator {
    // ---------- credentials ----------

    /** Random username, e.g. "Otilia35". */
    static username(): string {
        return faker.internet.username();
    }

    /**
     * Random password. Defaults to a 12-char password.
     * Pass length to tune for negative-test cases.
     */
    static password(length = 12): string {
        return faker.internet.password({ length });
    }

    /** Username + password pair. */
    static credentials(): Credentials {
        return {
            username: DataGenerator.username(),
            password: DataGenerator.password(),
        };
    }

    // ---------- contact ----------

    static firstName(): string {
        return faker.person.firstName();
    }

    static lastName(): string {
        return faker.person.lastName();
    }

    static email(): string {
        return faker.internet.email();
    }

    static phone(): string {
        return faker.phone.number();
    }

    static postalCode(): string {
        return faker.location.zipCode();
    }

    // ---------- primitives ----------

    /** Whole number in an inclusive range, e.g. a price or a quantity. */
    static number(min: number, max: number): number {
        return faker.number.int({ min, max });
    }

    /** Random true/false, for flags such as depositpaid. */
    static bool(): boolean {
        return faker.datatype.boolean();
    }

    /**
     * Date as `YYYY-MM-DD`, offset from a reference date.
     * Pass a negative offset for the past. `from` defaults to today, so
     * generated dates move with the calendar instead of ageing into the past.
     */
    static dateOffset(days: number, from: Date = new Date()): string {
        const d = new Date(from);
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
    }

    /** Pick one item from a list. Throws on an empty list rather than returning undefined. */
    static oneOf<T>(items: readonly T[]): T {
        if (items.length === 0) {
            throw new Error('[DataGenerator] oneOf() needs a non-empty list');
        }
        return faker.helpers.arrayElement(items);
    }

    // ---------- composites ----------

    /** Customer info for the TTACart checkout step-one form. */
    static checkoutCustomer(): CheckoutCustomer {
        return {
            firstName: DataGenerator.firstName(),
            lastName: DataGenerator.lastName(),
            postalCode: DataGenerator.postalCode(),
        };
    }

    /** Checkout customer, `.env` first, Faker for any field left unset. */
    static checkoutCustomerFromEnv(): CheckoutCustomer {
        const generated = DataGenerator.checkoutCustomer();
        return {
            firstName: envOr('CHECKOUT_FIRST_NAME', generated.firstName),
            lastName: envOr('CHECKOUT_LAST_NAME', generated.lastName),
            postalCode: envOr('CHECKOUT_POSTAL_CODE', generated.postalCode),
        };
    }

    /** Full profile — creds + checkout fields + contact. */
    static userProfile(): UserProfile {
        const firstName = DataGenerator.firstName();
        const lastName = DataGenerator.lastName();
        return {
            username: DataGenerator.username(),
            password: DataGenerator.password(),
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`,
            email: faker.internet.email({ firstName, lastName }),
            phone: DataGenerator.phone(),
            postalCode: DataGenerator.postalCode(),
        };
    }
}

export default DataGenerator;
