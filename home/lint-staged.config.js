module.exports = {
  // '*.{js,jsx,ts,tsx}': ['prettier --write', 'eslint --cache --fix', 'eslint'],
  '*.{js,jsx,ts,tsx}': ['prettier --write', 'npx oxlint@latest'],
  '**/*.ts?(x)': () => 'npm run check-types',
};
