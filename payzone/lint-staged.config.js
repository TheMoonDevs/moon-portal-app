module.exports = {
  '*.{js,jsx,ts,tsx}': ['prettier --write', 'npx oxlint@latest'],
  '**/*.ts?(x)': () => 'npm run check-types',
};
