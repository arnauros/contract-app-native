module.exports = {
  env: {
    es6: true,
    node: true,
    browser: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  extends: ["eslint:recommended", "google"],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {allowTemplateLiterals: true}],
    "max-len": "off", // Disable max line length rule globally
    "new-cap": "off", // Disable new-cap rule globally
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {
        // You can add other rules specific to test files here if needed
      },
    },
  ],
  globals: {},
};
