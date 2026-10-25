import js from "@eslint/js";
import ts from "typescript-eslint";
import vue from "eslint-plugin-vue";
export default ts.config(
  {
    ignores: [
      "dist/**",
      "dist-server/**",
      "node_modules/**",
      "src/api/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: { parserOptions: { parser: ts.parser } },
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/multiline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-indent": "off",
      "vue/first-attribute-linebreak": "off",
      "vue/html-closing-bracket-newline": "off",
      "vue/attributes-order": "off",
    },
  },
  {
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        crypto: "readonly",
        setTimeout: "readonly",
        URL: "readonly",
        Blob: "readonly",
        document: "readonly",
      },
    },
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
);
