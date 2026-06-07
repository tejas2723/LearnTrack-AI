/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#f8fafc", // slate-50
        heading: "#1e293b", // slate-800
        muted: "#64748b", // slate-500
        primary: {
          DEFAULT: "#4f46e5", // indigo-600
          hover: "#4338ca", // indigo-700
          light: "#e0e7ff", // indigo-100
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      }
    },
  },
  plugins: [],
}
