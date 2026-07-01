export const normalizeWaitlistEmail = (email: string) => email.trim().toLowerCase();

export const isValidWaitlistEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

