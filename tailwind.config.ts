import type { Config } from "tailwindcss";

// Opal Gems — Obsidian & Champagne palette.
// Overrides Tailwind's default neutral/emerald/amber/red palettes so existing
// utility classes (bg-neutral-50, text-emerald-800, etc.) automatically render
// with luxury tones. Adds `gold` and `plum` for jewelry accents.
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Warm obsidian–ivory range (replaces default cool grey neutral)
        neutral: {
          50:  "#FAF7F2",  // warm ivory background
          100: "#F4EFE4",  // raised surface light
          200: "#E8E2D5",  // border light
          300: "#D4CDBD",  // muted border
          400: "#A8A097",  // muted text on dark
          500: "#8A8278",  // mid
          600: "#6B6258",  // muted text on light
          700: "#3A332B",  // deep warm gray
          800: "#2B2520",  // border dark / raised surface dark
          900: "#1A1614",  // surface dark
          950: "#0C0A09",  // obsidian background dark
        },

        // Sage — success / approved / in-stock
        emerald: {
          50:  "#EEF2E7",
          100: "#DDE5D2",
          300: "#B6C39E",
          600: "#6B7F4F",
          700: "#586A41",
          800: "#4A5933",
          950: "#2A3320",
        },

        // Warm amber — pending / warning
        amber: {
          50:  "#FBF3DD",
          100: "#F5E5C5",
          300: "#E3C481",
          600: "#C9954A",
          700: "#A87B38",
          800: "#8B6520",
          950: "#3D2B0A",
        },

        // Oxblood — denied / write-off / danger
        red: {
          50:  "#F4DDDD",
          100: "#E8C8C8",
          300: "#C68585",
          600: "#8B3A3A",
          700: "#6F2C2C",
          800: "#5C2424",
          950: "#2E1010",
        },

        // Sky → muted slate-blue (used for in-transit)
        sky: {
          50:  "#E3EAEF",
          100: "#CBD7DF",
          300: "#8FA5B3",
          600: "#4A6678",
          700: "#39505F",
          800: "#2D404D",
          950: "#101A22",
        },

        // Champagne gold — brand / primary accent / CTA
        gold: {
          50:  "#FBF4E2",
          100: "#F4E4B0",
          200: "#E5CD7A",
          300: "#D6BA60",
          400: "#CFAB58",
          500: "#B89456",  // primary
          600: "#8B6F3F",  // hover / pressed
          700: "#6D5530",
          800: "#4F3D23",
          900: "#332815",
        },

        // Dusty plum — reservations / wishlist
        plum: {
          100: "#E1D8E8",
          300: "#BCAEC7",
          500: "#9787A8",
          600: "#7B6D8E",
          700: "#5F546F",
          800: "#4A4257",
          950: "#2C2434",
        },
      },
    },
  },
  plugins: [],
};
export default config;
