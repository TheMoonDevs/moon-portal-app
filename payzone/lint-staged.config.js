module.exports = {
  'portal/**/*.{js,jsx,ts,tsx}': ['eslint --cache --fix', 'prettier --write'],
  '**/*.ts?(x)': () => 'npm run check-types'
};