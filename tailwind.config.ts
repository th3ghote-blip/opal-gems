import type { Config } from "tailwindcss";

// Opal Gems — Obsidian & Champagne (deeper variant).
// Each shade pushed ~10% darker for a more antique, richer feel.
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

        // Deeper warm obsidian–parchment range
        neutral: {
          50:  "#F2EDE2",  // parchment background light
          100: "#ECE5D5",  // raised surface light
          200: "#DDD5C2",  // border light
          300: "#C5BCA6",  // muted border
          400: "#9B9282",  // muted text on dark
          500: "#776E62",
          600: "#5E5648",  // muted text on light
          700: "#2D2620",  // deep warm gray
          800: "#1F1A15",  // border dark / raised surface dark
          900: "#110E0B",  // surface dark
          950: "#080605",  // deep obsidian background dark
        },

        // Deeper sage — success / approved / in-stock
        emerald: {
          50:  "#E2EBD6",
          100: "#CFDBC2",
          300: "#A4B589",
          600: "#5A6F3F",
          700: "#475833",
          800: "#3A4825",
          950: "#1E2818",
        },

        // Deeper warm amber — pending / warning
        amber: {
          50:  "#F4E7C3",
          100: "#EDD7A5",
          300: "#D7B364",
          600: "#B8853A",
          700: "#946828",
          800: "#785718",
          950: "#2E1F05",
        },

        // Deeper oxblood — denied / write-off / danger
        red: {
          50:  "#ECC6C6",
          100: "#DCB4B4",
          300: "#B66E6E",
          600: "#762D2D",
          700: "#5A2222",
          800: "#491B1B",
          950: "#220A0A",
        },

        // Sky → deeper slate-blue (in-transit)
        sky: {
          50:  "#D4DCE2",
          100: "#BAC8D2",
          300: "#7C95A4",
          600: "#3D5667",
          700: "#2F4250",
          800: "#243440",
          950: "#0C1419",
        },

        // Antique champagne gold — brand / primary accent / CTA
        gold: {
          50:  "#F5EBD0",
          100: "#EDD68F",
          200: "#DDC264",
          300: "#CFAB58",
          400: "#BD9947",
          500: "#A47D44",  // primary (darker, antique)
          600: "#735A2D",  // hover / pressed
          700: "#5A4322",
          800: "#3F2F17",
          900: "#241B0E",
        },

        // Deeper dusty plum — reservations / wishlist
        plum: {
          100: "#CDC0D9",
          300: "#A89AB8",
          500: "#7E6F92",
          600: "#685A78",
          700: "#4E4259",
          800: "#3D3346",
          950: "#1F1828",
        },
      },
    },
  },
  plugins: [],
};
export default config;
