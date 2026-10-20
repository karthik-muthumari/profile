// Single source of truth for the publicly approved contact details (approved by the site owner).
// Anything else that looks like a contact detail (other e-mail, placeholder text) is a defect.
export const WORK_EMAIL = 'karthik.muthumari@mindera.com';
export const PERSONAL_EMAIL = 'karthikmuthumari7@gmail.com';
export const EMAIL_ALLOWLIST = [WORK_EMAIL, PERSONAL_EMAIL];
// Round 2: the WORK address is the PREFERRED contact (first, badged, hero mail icon, JSON-LD); personal is secondary.
export const PREFERRED_EMAIL = WORK_EMAIL;
export const PREFERRED_BADGE = /preferred/i;
export const LINKEDIN_URL = 'https://www.linkedin.com/in/karthikmuthumari/';
export const GITHUB_URL = 'https://github.com/karthik-muthumari';

// Placeholder / unfinished-content markers that must not appear anywhere in the published site's HTML
export const PLACEHOLDER_RAW = [/hello@example\.com/i, /example\.(com|org|net)\b/i, /your-(github|linkedin)-handle/i, /TODO\(user\)/i];
// ... or in its visible text
export const PLACEHOLDER_VISIBLE = /\bTODO\b|\bFIXME\b|\bTBD\b|lorem ipsum|\byour[- ](email|handle|name)\b|\bplaceholder (email|text|url)\b/i;

// Round 2: image + motion contract
export const AVATAR_MAX_KB = +(process.env.AVATAR_MAX_KB || 400);        // hero photo web copy (design/07 §4: <=250KB opaque, <=400KB cut-out)
export const AVATAR_MAX_PX = +(process.env.AVATAR_MAX_PX || 1600);       // never ship the multi-megapixel original
// basenames that must not exist anywhere in out/ (case-sensitive: the original is literally MyProfilePic.PNG; the web copy must be lowercase)
export const ORIGINAL_PHOTO_NAMES = [/^MyProfilePic\.PNG$/, /^MyProfilePic\./i, /^DSC\d+/i, /^portrait-(square|tall|wide)\.jpe?g$/i];
export const MOTION_KEY = 'motion';                                       // localStorage key (design/07 §3.1)
export const MOTION_TIERS = ['full', 'gentle', 'off'];
