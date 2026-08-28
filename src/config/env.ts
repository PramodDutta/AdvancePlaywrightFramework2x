/** Reads `.env` values. Importing this module loads `.env` into process.env once. */
import dotenv from 'dotenv';

// quiet silences dotenv v17's banner; override stays false so shell/CI vars win.
dotenv.config({ quiet: true });

function read(key: string): string | undefined {
    return process.env[key]?.trim() || undefined;
}

/** Required value; throws when unset or blank. */
export function requireEnv(key: string): string {
    const value = read(key);
    if (!value) {
        throw new Error(`Missing required env var ${key}. Set it in .env (see .env.example)`);
    }
    return value;
}

/** Optional value with a fallback. */
export function envOr(key: string, fallback: string): string {
    return read(key) ?? fallback;
}

/** Asserts keys exist without returning them; reports all missing keys at once. */
export function assertEnv(...keys: string[]): void {
    const missing = keys.filter((key) => !read(key));
    if (missing.length > 0) {
        throw new Error(`Missing required env var(s) ${missing.join(', ')}. Set them in .env (see .env.example)`);
    }
}
