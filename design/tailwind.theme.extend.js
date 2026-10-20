/**
 * design/tailwind.theme.extend.js  — drop into tailwind.config.{js,ts}:
 *
 *   const tokens = require('./design/tailwind.theme.extend.js')  // or copy the object
 *   module.exports = {
 *     darkMode: ['selector', '[data-theme="dark"]'],   // Tailwind >=3.4.1. (v3.0-3.3: ['class','[data-theme="dark"]'])
 *     content: ['./app/**\/*.{ts,tsx,mdx}', './components/**\/*.{ts,tsx}', './content/**\/*.md'],
 *     theme: { extend: tokens },
 *   }
 *
 * Requires design/tokens.css to be imported in app/globals.css (copy it into src; do not import across dirs at build).
 * Because colours are RGB channels, `bg-accent/20`, `text-fg/70` etc. work.
 * IMPORTANT: since the default theme is dark and `:root:not([data-theme])` follows OS, do NOT rely on
 * Tailwind `dark:` variants for colours — use the semantic classes below (bg-bg, text-fg ...) which switch
 * automatically. Reserve `dark:` for rare one-offs.
 *
 * Tailwind v4: put the same names in CSS instead:
 *   @theme inline { --color-bg: rgb(var(--c-bg)); --color-fg: rgb(var(--c-text)); ... --font-display: var(--font-display); }
 *   @custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
 */
const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;

module.exports = {
  colors: {
    bg: c('c-bg'),
    surface: { DEFAULT: c('c-surface'), 2: c('c-surface-2') },
    line: { DEFAULT: c('c-border'), strong: c('c-border-strong') },
    fg: { DEFAULT: c('c-text'), muted: c('c-muted'), subtle: c('c-subtle') },
    accent: { DEFAULT: c('c-accent'), hi: c('c-accent-hi'), lo: c('c-accent-lo'), ink: c('c-on-accent') },
    sky: c('c-accent-2'),
    focus: c('c-focus'),
    success: c('c-success'),
    code: c('c-code-bg'),
  },
  fontFamily: {
    display: ['var(--font-display)'],
    sans: ['var(--font-body)'],
    serif: ['var(--font-serif)'],
    mono: ['var(--font-mono)'],
  },
  fontSize: {
    display: ['var(--fs-display)', { lineHeight: 'var(--lh-display)', letterSpacing: 'var(--ls-display)', fontWeight: '700' }],
    h1: ['var(--fs-h1)', { lineHeight: 'var(--lh-h1)', letterSpacing: 'var(--ls-h1)', fontWeight: '700' }],
    h2: ['var(--fs-h2)', { lineHeight: 'var(--lh-h2)', letterSpacing: 'var(--ls-h2)', fontWeight: '700' }],
    h3: ['var(--fs-h3)', { lineHeight: 'var(--lh-h3)', letterSpacing: 'var(--ls-h3)', fontWeight: '600' }],
    h4: ['var(--fs-h4)', { lineHeight: 'var(--lh-h4)', fontWeight: '600' }],
    lead: ['var(--fs-lead)', { lineHeight: '1.55' }],
    body: ['var(--fs-body)', { lineHeight: 'var(--lh-body)' }],
    small: ['var(--fs-small)', { lineHeight: 'var(--lh-small)' }],
    micro: ['var(--fs-micro)', { lineHeight: '1.4', letterSpacing: 'var(--ls-eyebrow)', fontWeight: '600' }],
    mono: ['var(--fs-mono)', { lineHeight: 'var(--lh-mono)' }],
  },
  spacing: { section: 'var(--section-y)', gutter: 'var(--gutter)', nav: 'var(--nav-h)' },
  maxWidth: { container: 'var(--container)', wide: 'var(--container-wide)', prose: 'var(--container-prose)' },
  borderRadius: {
    xs: 'var(--r-xs)', sm: 'var(--r-sm)', md: 'var(--r-md)', lg: 'var(--r-lg)', xl: 'var(--r-xl)',
    pill: 'var(--r-pill)', blob: 'var(--r-blob)',
  },
  boxShadow: {
    sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)', glow: 'var(--shadow-glow)',
  },
  backgroundImage: {
    'grad-accent': 'var(--grad-accent)', 'grad-text': 'var(--grad-text)',
    'grad-ring': 'var(--grad-ring)', 'glow-hero': 'var(--glow-hero)',
  },
  screens: { xs: '480px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
  transitionTimingFunction: { 'out-expo': 'var(--ease-out-expo)', 'in-out': 'var(--ease-in-out)' },
  keyframes: {
    'avatar-float': { '0%,100%': { transform: 'translateY(0) rotate(-.6deg)' }, '50%': { transform: 'translateY(-14px) rotate(.6deg)' } },
    'ring-spin': { to: { transform: 'rotate(360deg)' } },
    'blob-morph': {
      '0%,100%': { borderRadius: '58% 42% 55% 45% / 48% 56% 44% 52%' },
      '50%': { borderRadius: '44% 56% 42% 58% / 56% 44% 56% 44%' },
    },
  },
  animation: {
    'avatar-float': 'avatar-float 6s ease-in-out infinite',
    'ring-spin': 'ring-spin 14s linear infinite',
    'blob-morph': 'blob-morph 10s ease-in-out infinite',
  },
};
