/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#17233d',
    tint: '#1769ff',

    // Core surfaces
    background: '#f6f8fb',
    foreground: '#17233d',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#17233d',

    // Primary action color (buttons, links, active states)
    primary: '#1769ff',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#eaf1ff',
    secondaryForeground: '#214a9b',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#eef2f7',
    mutedForeground: '#6f7b91',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#fff3e9',
    accentForeground: '#a64e20',

    // Destructive actions (delete, error states)
    destructive: '#dc4b5c',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#dfe6f0',
    input: '#dfe6f0',

    navy: '#17233d',
    blue: '#1769ff',
    sky: '#dcecff',
    coral: '#f47f5b',
    coralSoft: '#fff0e8',
    green: '#238b67',
    greenSoft: '#e5f6ee',
    purple: '#7468e8',
    purpleSoft: '#eeecff',
    yellow: '#f1b44c',
    yellowSoft: '#fff5d9',
    white: '#ffffff',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
