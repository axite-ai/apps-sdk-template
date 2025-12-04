import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ["tests/**"],
  },
  {
    // Template-specific rules - more permissive for template flexibility
    rules: {
      // Allow `any` in template code that integrates with external APIs
      // Templates often need flexibility for third-party type compatibility
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default config;
