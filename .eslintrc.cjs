module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['dist', 'coverage', 'node_modules'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/consistent-type-imports': 'warn',
    // `_` prefiksi — "bu qiymat ataylab ishlatilmayapti" degan kelishuv:
    // interfeys imzosini saqlash yoki destrukturizatsiyada maydonni chiqarib
    // tashlash uchun kerak bo'ladi. Prefikssiz ishlatilmagan o'zgaruvchi
    // esa o'lik kod bo'lib qoladi va xato sifatida ushlanadi.
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
  },
};
