import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // El proyecto integra respuestas JSON dinámicas de Prisma/Gemini en varias
      // pantallas heredadas. Se migrarán gradualmente a DTOs estrictos.
      "@typescript-eslint/no-explicit-any": "off",
      // Las cargas iniciales llaman Server Actions desde componentes cliente.
      "react-hooks/set-state-in-effect": "off",
      // El logo institucional puede ser remoto y debe conservar su URL original
      // para la exportación con html2canvas.
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
