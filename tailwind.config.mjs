export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cetacean: { DEFAULT: "#0C163D", 90: "#1F2950", 70: "#4A557A", 30: "#B5BAC8", 10: "#E2E4EC" },
        seashell: { DEFAULT: "#FFF7EB", shade: "#F5ECDB", deeper: "#EBDFC7" },
        sky: { DEFAULT: "#66CEE7", light: "#B4E5F2", deep: "#3FB3D0" },
        pearly: { DEFAULT: "#A9729B", light: "#D2A8C7", deep: "#8B5C7E" },
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["'Nunito Sans'", "system-ui", "sans-serif"],
      },
      letterSpacing: { tightest: "-0.02em", eyebrow: "0.12em" },
      borderRadius: { pill: "999px", "arch-top": "999px 999px 0 0" },
      boxShadow: {
        xs: "0 1px 2px rgba(12,22,61,0.06)",
        sm: "0 2px 6px rgba(12,22,61,0.08)",
        md: "0 8px 20px rgba(12,22,61,0.10)",
        lg: "0 18px 40px rgba(12,22,61,0.14)",
      },
      transitionTimingFunction: { soft: "cubic-bezier(.22,.61,.36,1)" },
    },
  },
  plugins: [],
};
