/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.tsx", "./components/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["SF Pro", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
