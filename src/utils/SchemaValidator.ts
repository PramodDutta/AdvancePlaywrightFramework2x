/**
 * SchemaValidator — runtime JSON Schema checks for API responses, via Ajv.
 *
 * A TypeScript `interface` is erased at compile time, so casting a response to
 * one proves nothing about what the server actually sent. This is the runtime
 * counterpart: it fails the test when a field is dropped, renamed, or changes
 * type. Pair it with the interfaces rather than replacing them.
 *
 *   import schema from '@testdata/schemas/create-booking.schema.json';
 *   SchemaValidator.assertValid(schema, body, 'POST /booking');
 *
 * Ajv notes:
 *   - `allErrors` reports every violation, not just the first.
 *   - `ajv-formats` is what makes `"format": "date"` do anything.
 *   - `ajv.compile()` caches by schema identity, so the module-level instance
 *     means each schema is compiled once per run.
 */

import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

const ajv = addFormats(new Ajv({ allErrors: true }));

export class SchemaValidator {
    /** Validate and return every violation as readable text. Never throws on invalid data. */
    static validate(schema: object, data: unknown): ValidationResult {
        const validate = ajv.compile(schema);
        const valid = validate(data) as boolean;
        return { valid, errors: (validate.errors ?? []).map(SchemaValidator.describe) };
    }

    /** Validate, or throw listing every violation at once. */
    static assertValid(schema: object, data: unknown, label = 'response'): void {
        const { valid, errors } = SchemaValidator.validate(schema, data);
        if (!valid) {
            throw new Error(`[SchemaValidator] ${label} does not match schema:\n  - ${errors.join('\n  - ')}`);
        }
    }

    /**
     * Ajv's raw errors are near-unreadable in a report. Missing and extra
     * property errors carry an empty `instancePath`, so the offending key lives
     * in `params` and has to be spliced back in to name the field.
     */
    private static describe(error: ErrorObject): string {
        const path = error.instancePath || '/';
        const key = error.params?.missingProperty ?? error.params?.additionalProperty;
        return `${key ? `${path}/${key}` : path} ${error.message}`;
    }
}

export default SchemaValidator;
