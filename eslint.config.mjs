import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Vendored EasyUI components (installed with the shadcn CLI). Kept as published so
    // they can be updated from the registry; they trip two React Compiler lint rules.
    files: ["src/components/ui/donut-chart.tsx", "src/components/ui/animated-number.tsx", "src/components/ui/draw-checkbox.tsx", "src/lib/chart-primitives.tsx"],
    rules: { "react-hooks/refs": "off", "react-hooks/immutability": "off" },
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
