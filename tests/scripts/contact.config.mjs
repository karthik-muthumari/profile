// Single source of truth for the publicly approved contact details (approved by the site owner).
// Anything else that looks like a contact detail (other e-mail, placeholder text) is a defect.
export const WORK_EMAIL = 'karthik.muthumari@mindera.com';
export const PERSONAL_EMAIL = 'karthikmuthumari7@gmail.com';
export const EMAIL_ALLOWLIST = [WORK_EMAIL, PERSONAL_EMAIL];
export const LINKEDIN_URL = 'https://www.linkedin.com/in/karthikmuthumari/';
export const GITHUB_URL = 'https://github.com/karthik-muthumari';

// Placeholder / unfinished-content markers that must not appear anywhere in the published site's HTML
export const PLACEHOLDER_RAW = [/hello@example\.com/i, /example\.(com|org|net)\b/i, /your-(github|linkedin)-handle/i, /TODO\(user\)/i];
// ... or in its visible text
export const PLACEHOLDER_VISIBLE = /\bTODO\b|\bFIXME\b|\bTBD\b|lorem ipsum|\byour[- ](email|handle|name)\b|\bplaceholder (email|text|url)\b/i;
