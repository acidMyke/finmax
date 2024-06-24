/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
  arrowParens: 'avoid',
  printWidth: 120,
  singleQuote: true,
  jsxSingleQuote: true,
  trailingComma: 'all',
  quoteProps: 'consistent',
  plugins: ['@trivago/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],
  importOrder: [
    '~/env',
    '^react',
    '^next',
    '<THIRD_PARTY_MODULES>',
    '^[./](?!.*\\.(css|scss|less|styl|png|jpg|jpeg|gif|svg|ttf|woff|woff2|eot|otf)$)',
    '^[./]',
  ],
};

export default config;
