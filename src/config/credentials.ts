export const credentials = {
    standardUser: process.env.STANDARD_USER ?? 'standard_user',
    password: process.env.TTA_SECRET ?? 'tta_secret',
} as const;
