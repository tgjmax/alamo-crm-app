module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'warn',
  },
  overrides: [
    {
      // CLI-generated shadcn/ui components are kept verbatim; relax the rules
      // their generated idioms trip (empty prop interfaces extending HTML attrs).
      files: ['src/components/ui/**/*.tsx'],
      rules: {
        '@typescript-eslint/no-empty-interface': 'off',
      },
    },
  ],
};
