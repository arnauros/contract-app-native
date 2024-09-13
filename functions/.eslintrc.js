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
    quotes: ["error", "double", { allowTemplateLiterals: true }],
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {
        "max-len": ["error", { code: 1200 }], // Increase max line length to 120
        "max-len": ["off"], // Disable max line length rule
        "new-cap": ["off"], // Disable new-cap rule
      },
    },
  ],
  globals: {},
};
