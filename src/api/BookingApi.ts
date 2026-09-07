// All the payloads which we have 
// create
// How you can serialize or deserialize your responses 
// You can perform a JSON schema validation. 
// How you can basically perform the json path plus 
// Now you can similarly use auth or even JWT token, whatever 

import { APIResponse } from '@playwright/test';
import { ApiHelper, ApiContext } from '@utils/ApiHelper';

export interface BookingDates {
    checkin: string;
    checkout: string;
}

export interface Booking {
    firstname: string;
    lastname: string;
    totalprice: number;
    depositpaid: boolean;
    bookingdates: BookingDates;
    additionalneeds?: string;
}
export interface CreateBookingResponse {
    bookingid: number;
    booking: Booking;
}
export interface BookingId {
    bookingid: number;
}
export interface BookingFilters {
    firstname?: string;
    lastname?: string;
    checkin?: string;
    checkout?: string;
}

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

/** restful-booker answers an expired or unknown token with 403, never 401. */
const TOKEN_REJECTED = 403;

export class BookingApi {


    private apiHelper: ApiHelper;
    private baseUrl: string;
    private username: string;
    private password: string;
    private cachedToken?: string;

    constructor(
        context: ApiContext,
        baseUrl = 'https://restful-booker.herokuapp.com',
        credentials: { username?: string; password?: string } = {},
    ) {
        this.apiHelper = new ApiHelper(context);
        this.baseUrl = baseUrl;
        this.username = credentials.username ?? 'admin';
        this.password = credentials.password ?? 'password123';
    }

     private authHeaders(token: string): Record<string, string> {
        return { ...JSON_HEADERS, Cookie: `token=${token}` };
    }

    // ---------- token lifecycle ----------

    /** Managed token, minted on first use. Pass `true` to force a re-auth. */
    async getToken(forceRefresh = false): Promise<string> {
        if (forceRefresh) this.invalidateToken();
        return (this.cachedToken ??= await this.auth());
    }

    /** Drop the cached token so the next managed call mints a new one. */
    invalidateToken(): void {
        this.cachedToken = undefined;
    }

    /**
     * Send an authenticated request. An explicit token goes out as-is so a negative
     * test can still assert a 403; the managed token re-auths once and retries.
     */
    private async sendAuthed(
        send: (token: string) => Promise<APIResponse>,
        explicitToken?: string,
    ): Promise<APIResponse> {
        if (explicitToken !== undefined) return send(explicitToken);
        const res = await send(await this.getToken());
        return res.status() === TOKEN_REJECTED ? send(await this.getToken(true)) : res;
    }

    async getAllBookings(filters?: BookingFilters): Promise<BookingId[]> {
        const response = await this.apiHelper.get(`${this.baseUrl}/booking`, {
            params: filters as Record<string, string> | undefined,
        });
        if (!this.apiHelper.isSuccess(response)) {
            throw new Error(`[BookingApi] GET /booking failed: ${response.status()}`);
        }
        return this.apiHelper.parseJsonResponse<BookingId[]>(response);
    }

      async getBooking(id: number): Promise<Booking> {
        const response = await this.getBookingResponse(id);
        if (!this.apiHelper.isSuccess(response)) {
            throw new Error(`[BookingApi] GET /booking/${id} failed: ${response.status()}`);
        }
        return this.apiHelper.parseJsonResponse<Booking>(response);
    }


    /** GET /booking/{id} -> raw response, so callers can assert status (e.g. 404). */
    async getBookingResponse(id: number): Promise<APIResponse> {
        return this.apiHelper.get(`${this.baseUrl}/booking/${id}`);
    }

    /**
     * POST /auth -> token. Note restful-booker answers bad credentials with
     * **200** and `{ reason: "Bad credentials" }`, so the status alone is not
     * enough: the body has to be checked for a token.
     */
     async auth(username = this.username, password = this.password): Promise<string> {
        const response = await this.apiHelper.post(`${this.baseUrl}/auth`, { username, password }, {
            headers: JSON_HEADERS,
        });
        if (!this.apiHelper.isSuccess(response)) {
            throw new Error(`[BookingApi] POST /auth failed: ${response.status()}`);
        }
        const body = await this.apiHelper.parseJsonResponse<{ token?: string; reason?: string }>(response);
        if (!body.token) {
            throw new Error(`[BookingApi] /auth returned no token. Reason: ${body.reason ?? 'unknown'}`);
        }
        return body.token;
    }

    /** POST /booking -> raw response, so callers can assert a rejection (e.g. 500). */
    async createBookingResponse(payload: unknown): Promise<APIResponse> {
        return this.apiHelper.post(`${this.baseUrl}/booking`, payload, { headers: JSON_HEADERS });
    }

     /** POST /booking -> { bookingid, booking }. No auth required. */
    async createBooking(payload: Booking): Promise<CreateBookingResponse> {
        const response = await this.createBookingResponse(payload);
        if (!this.apiHelper.isSuccess(response)) {
            throw new Error(`[BookingApi] POST /booking failed: ${response.status()}`);
        }
        return this.apiHelper.parseJsonResponse<CreateBookingResponse>(response);
    }

    /** PUT /booking/{id} -> raw response, so callers can assert a 403. */
    async updateBookingResponse(id: number, payload: unknown, token?: string): Promise<APIResponse> {
        return this.sendAuthed(
            (t) => this.apiHelper.put(`${this.baseUrl}/booking/${id}`, payload, {
                headers: this.authHeaders(t),
            }),
            token,
        );
    }

    /** Omit `token` to use the managed one, which renews itself on a 403. */
    async updateBooking(id: number, payload: Booking, token?: string): Promise<Booking> {
        const response = await this.updateBookingResponse(id, payload, token);
        if (!this.apiHelper.isSuccess(response)) {
            throw new Error(`[BookingApi] PUT /booking/${id} failed: ${response.status()}`);
        }
        return this.apiHelper.parseJsonResponse<Booking>(response);
    }

     async patchBooking(id: number, partial: Partial<Booking>, token?: string): Promise<Booking> {
        const response = await this.sendAuthed(
            (t) => this.apiHelper.patch(`${this.baseUrl}/booking/${id}`, partial, {
                headers: this.authHeaders(t),
            }),
            token,
        );
        if (!this.apiHelper.isSuccess(response)) {
            throw new Error(`[BookingApi] PATCH /booking/${id} failed: ${response.status()}`);
        }
        return this.apiHelper.parseJsonResponse<Booking>(response);
    }

     async deleteBooking(id: number, token?: string): Promise<number> {
        const response = await this.sendAuthed(
            (t) => this.apiHelper.delete(`${this.baseUrl}/booking/${id}`, {
                headers: this.authHeaders(t),
            }),
            token,
        );
        return response.status();
    }






}