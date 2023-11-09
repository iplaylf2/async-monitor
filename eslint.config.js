const js = require("@eslint/js");
const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  // eslint-disable-next-line no-undef
  baseDirectory: __dirname,
});

module.exports = [
  js.configs.recommended,
  ...compat.config({
    overrides: [
      {
        extends: [
          "standard-with-typescript",
          "plugin:@typescript-eslint/recommended",
          "plugin:@typescript-eslint/recommended-type-checked",
          "plugin:@typescript-eslint/strict",
          "plugin:@typescript-eslint/strict-type-checked",
          "plugin:@typescript-eslint/stylistic",
          "plugin:@typescript-eslint/stylistic-type-checked",
        ],
        files: ["*.ts"],
        rules: {
          "@typescript-eslint/ban-types": [
            "error",
            { extendDefaults: true, types: { "{}": false } },
          ],
          "@typescript-eslint/consistent-type-definitions": "off",
          "@typescript-eslint/explicit-function-return-type": "off",
          "@typescript-eslint/explicit-member-accessibility": "error",
          "@typescript-eslint/member-ordering": [
            "error",
            {
              default: {
                memberTypes: [
                  "constructor",
                  "method",
                  "call-signature",
                  "set",
                  "get",
                  "field",
                  "signature",
                ],
                optionalityOrder: "required-first",
                order: "alphabetically-case-insensitive",
              },
            },
          ],
          "@typescript-eslint/no-invalid-void-type": "off",
          "@typescript-eslint/no-non-null-assertion": "off",
          "@typescript-eslint/require-await": "off",
          "@typescript-eslint/sort-type-constituents": "error",
          "@typescript-eslint/strict-boolean-expressions": [
            "error",
            { allowNumber: false, allowString: false },
          ],
        },
      },
    ],
  }),
  {
    rules: {
      curly: "error",
      "sort-imports": [
        "error",
        {
          memberSyntaxSortOrder: ["none", "all", "single", "multiple"],
        },
      ],
      "sort-keys": "error",
      "sort-vars": "error",
      yoda: "off",
    },
  },
  {
    files: ["eslint.config.js"],
    languageOptions: {
      sourceType: "commonjs",
    },
  },
  ...compat.extends("plugin:prettier/recommended"),
];
