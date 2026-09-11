/**
 * Custom data generator agent.
 *
 * Faker produces random values; this produces *situated* ones. Each booking
 * comes with a `scenario` label saying what it is meant to exercise (a long
 * name, a zero price, a single-night stay), which is the part a test author
 * would otherwise have to think up by hand.
 *
 * The `scenario` field is metadata for the report and is stripped before the
 * payload is sent to the API, which rejects unknown fields.
 */

import { createAgent, type AgentResult } from '../agentFactory';
import type { Booking } from '../../api/BookingApi';
import schema from '@testdata/schemas/ai-booking-payload.schema.json';

export interface GeneratedBooking extends Booking {
    /** Why this row exists. Report metadata, not part of the API payload. */
    scenario: string;
}

export interface GeneratedBookings {
    bookings: GeneratedBooking[];
}

export interface DataGenInput {
    count: number;
    /** Free-text steer, e.g. "edge cases around price and stay length". */
    focus?: string;
}

const SYSTEM = [
    'You generate test data for an API test suite.',
    'You reply with JSON only. No prose, no markdown fences, no explanation.',
    'Every value must be realistic enough to pass a strict JSON Schema.',
].join(' ');

export const dataGenAgent = createAgent<DataGenInput, GeneratedBookings>({
    name: 'data-generator',
    system: SYSTEM,
    schema: schema as object,
    // Slight temperature: at 0 the model returns the same names every run,
    // which defeats the point of generating varied data.
    temperature: 0.7,
    maxTokens: 1500,
    buildPrompt: ({ count, focus }) => `
Generate ${count} booking payloads for the Restful Booker API.

Return exactly this JSON shape:
{"bookings":[{"firstname":"","lastname":"","totalprice":0,"depositpaid":true,
"bookingdates":{"checkin":"YYYY-MM-DD","checkout":"YYYY-MM-DD"},
"additionalneeds":"","scenario":""}]}

Rules:
- checkin and checkout are YYYY-MM-DD, and checkout is strictly after checkin.
- totalprice is a whole number between 0 and 100000.
- firstname and lastname are 1 to 40 characters.
- additionalneeds is optional; include it on some rows and omit it on others.
- scenario names what the row exercises, e.g. "minimum price" or "long stay".
- Vary the rows. Do not return ${count} near-identical bookings.
${focus ? `- Focus on: ${focus}` : ''}
`.trim(),
});

/** Drop report-only fields so the payload matches what the API accepts. */
export function toApiPayload(generated: GeneratedBooking): Booking {
    const { scenario, ...payload } = generated;
    void scenario;
    return payload;
}

export type DataGenResult = AgentResult<GeneratedBookings>;
