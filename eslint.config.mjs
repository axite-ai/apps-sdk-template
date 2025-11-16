import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ["tests/**"],
  },
]

export default config
