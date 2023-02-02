import astro from "eslint-plugin-astro";
import globals from "globals";
import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";
import vue from "eslint-plugin-vue";

const maxNestedCallbacks = 3;

export default [
  {
    ignores: ["dist/", "dist-test/", ".astro/", ".wrangler/", ".superpowers/"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: { parserOptions: { parser: tseslint.parser } }
  },
  prettier,
  {
    languageOptions: {
      ecmaVersion: "latest",
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      "accessor-pairs": ["error", { getWithoutSet: true, setWithoutGet: true }],
      "arrow-body-style": "error",
      "block-scoped-var": "error",
      "camelcase": "error",
      "capitalized-comments": "error",
      "class-methods-use-this": "error",
      "consistent-return": ["error", { treatUndefinedAsUnspecified: true }],
      "consistent-this": "error",
      "curly": "error",
      "default-case-last": "error",
      "default-param-last": "error",
      "dot-notation": "error",
      "eqeqeq": "error",
      "grouped-accessor-pairs": "error",
      "guard-for-in": "error",
      "init-declarations": "error",
      "line-comment-position": ["error", { position: "above" }],
      "max-depth": "error",
      "max-nested-callbacks": ["error", maxNestedCallbacks],
      "new-cap": "error",
      "no-array-constructor": "error",
      "no-case-declarations": "error",
      "no-delete-var": "error",
      "no-div-regex": "error",
      "no-duplicate-imports": "error",
      "no-else-return": "error",
      "no-empty": "error",
      "no-empty-function": "error",
      "no-empty-static-block": "error",
      "no-eval": "error",
      "no-extra-bind": "error",
      "no-extra-boolean-cast": "error",
      "no-extra-label": "error",
      "no-implicit-coercion": "error",
      "no-implicit-globals": "error",
      "no-implied-eval": "error",
      "no-invalid-this": "error",
      "no-magic-numbers": "error",
      "no-nested-ternary": "error",
      "no-nonoctal-decimal-escape": "error",
      "no-object-constructor": "error",
      "no-redeclare": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              message: "Import from src/ with @/ instead.",
              regex: "^\\.\\.(/|$)"
            }
          ]
        }
      ],
      "no-return-assign": "error",
      "no-script-url": "error",
      "no-self-compare": "error",
      "no-undefined": "error",
      "no-underscore-dangle": "error",
      "no-unmodified-loop-condition": "error",
      "no-unneeded-ternary": "error",
      "no-unused-expressions": "error",
      "no-unused-labels": "error",
      "no-useless-call": "error",
      "no-useless-catch": "error",
      "no-useless-computed-key": "error",
      "no-useless-concat": "error",
      "no-useless-constructor": "error",
      "no-useless-escape": "error",
      "no-useless-rename": "error",
      "no-useless-return": "error",
      "no-var": "error",
      "no-void": "error",
      "no-with": "error",
      "prefer-arrow-callback": "error",
      "prefer-const": "error",
      "prefer-destructuring": "error",
      "prefer-exponentiation-operator": "error",
      "prefer-numeric-literals": "error",
      "prefer-object-has-own": "error",
      "prefer-regex-literals": "error",
      "prefer-rest-params": "error",
      "prefer-spread": "error",
      "prefer-template": "error",
      "require-unicode-regexp": "error",
      "sort-imports": "error",
      "sort-keys": "error",
      "symbol-description": "error",
      "unicode-bom": ["error", "never"],
      "vars-on-top": "error"
    }
  },
  {
    // Tests spell out literal expectations and nest describe/it blocks
    files: ["tests/**"],
    rules: { "max-nested-callbacks": "off", "no-magic-numbers": "off" }
  }
];
