/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./views/**/*.ejs', './views/partials/**/*.ejs', './public/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
