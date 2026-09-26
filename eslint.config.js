import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      eslintConfigPrettier,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    // These files intentionally co-export helpers/variants, or are application
    // and editor entrypoints rather than Fast Refresh component modules.
    files: [
      "src/main.tsx",
      "vly-toolbar-readonly.tsx",
      "src/components/portfolio/SiteChrome.tsx",
      "src/components/ui/badge.tsx",
      "src/components/ui/button-group.tsx",
      "src/components/ui/button.tsx",
      "src/components/ui/form.tsx",
      "src/components/ui/navigation-menu.tsx",
      "src/components/ui/sidebar.tsx",
      "src/components/ui/toggle.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
