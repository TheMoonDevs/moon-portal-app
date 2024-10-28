module.exports = {
  '*.{js,jsx,ts,tsx}': ['prettier --write', 'eslint --cache --fix', 'eslint'],
  '**/*.ts?(x)': () => 'npm run check-types',
};
