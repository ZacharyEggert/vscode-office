import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, lazyPlugins } from "vite-plus";
import react from "@vitejs/plugin-react";
import { vditorDevPlugin, vditorProdBuildPlugin } from "./vite/vditorPlugin";

const cwd = process.cwd();
const argv = process.argv;
const isProdBuild = argv.includes("build") && argv.some((arg) => arg.includes("production"));

if (isProdBuild) {
  rmSync(resolve(cwd, "out"), { recursive: true, force: true });
}

if (argv.join(",").includes("mode")) {
  void import("./build");
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  fmt: {
    // ponytail: vendored/minified files and markdown fixtures must stay byte-exact
    ignorePatterns: ["**/*.min.*", "resource/pdf/**", "test/markdown/**"],
  },
  lint: {
    plugins: ["oxc", "typescript", "unicorn"],
    categories: {
      correctness: "warn",
    },
    env: {
      builtin: true,
    },
    ignorePatterns: ["**/*.d.ts", "dist", "vditor", "resource/pdf"],
    overrides: [
      {
        files: ["src/**/*.{ts,tsx}"],
        rules: {
          "constructor-super": "off",
          "getter-return": "off",
          "no-class-assign": "off",
          "no-const-assign": "off",
          "no-dupe-class-members": "off",
          "no-dupe-keys": "off",
          "no-func-assign": "off",
          "no-import-assign": "off",
          "no-new-native-nonconstructor": "off",
          "no-obj-calls": "off",
          "no-redeclare": "off",
          "no-setter-return": "off",
          "no-this-before-super": "off",
          "no-undef": "off",
          "no-unreachable": "off",
          "no-unsafe-negation": "off",
          "no-var": "error",
          "no-with": "off",
          "prefer-const": "error",
          "prefer-rest-params": "error",
          "prefer-spread": "error",
          "no-array-constructor": "error",
          "no-unused-expressions": "error",
          "no-unused-vars": "off",
          "typescript/ban-ts-comment": "error",
          "typescript/no-duplicate-enum-values": "error",
          "typescript/no-empty-object-type": "off",
          "typescript/no-explicit-any": "off",
          "typescript/no-extra-non-null-assertion": "error",
          "typescript/no-misused-new": "error",
          "typescript/no-namespace": "error",
          "typescript/no-non-null-asserted-optional-chain": "error",
          "typescript/no-require-imports": "error",
          "typescript/no-this-alias": "off",
          "typescript/no-unnecessary-type-constraint": "error",
          "typescript/no-unsafe-declaration-merging": "error",
          "typescript/no-unsafe-function-type": "error",
          "typescript/no-wrapper-object-types": "error",
          "typescript/prefer-as-const": "error",
          "typescript/prefer-namespace-keyword": "error",
          "typescript/triple-slash-reference": "error",
          "unused-imports/no-unused-imports": "error",
          "no-empty-function": "off",
          "typescript/no-var-requires": "off",
        },
        jsPlugins: ["eslint-plugin-unused-imports"],
        env: {
          es2026: true,
          browser: true,
          node: true,
        },
      },
      {
        files: ["src/react/**/*.tsx"],
        rules: {
          "react/display-name": "error",
          "react/jsx-key": "error",
          "react/jsx-no-comment-textnodes": "error",
          "react/jsx-no-duplicate-props": "error",
          "react/jsx-no-target-blank": "off",
          "react/jsx-no-undef": "error",
          "react/no-children-prop": "error",
          "react/no-danger-with-children": "error",
          "react/no-direct-mutation-state": "error",
          "react/no-find-dom-node": "error",
          "react/no-is-mounted": "error",
          "react/no-render-return-value": "error",
          "react/no-string-refs": "error",
          "react/no-unescaped-entities": "error",
          "react/no-unknown-property": "error",
          "react/no-unsafe": "off",
          "react/react-in-jsx-scope": "off",
          "react/require-render-return": "error",
          "react/rules-of-hooks": "error",
          "react/exhaustive-deps": "warn",
          "react/static-components": "error",
          "react/use-memo": "error",
          "react/preserve-manual-memoization": "error",
          "react/incompatible-library": "warn",
          "react/immutability": "error",
          "react/globals": "error",
          "react/refs": "error",
          "react/set-state-in-effect": "error",
          "react/error-boundaries": "error",
          "react/purity": "error",
          "react/set-state-in-render": "error",
          "react/unsupported-syntax": "warn",
          "react/only-export-components": [
            "warn",
            {
              allowConstantExport: true,
            },
          ],
          "unused-imports/no-unused-imports": "error",
        },
        plugins: ["react"],
        jsPlugins: ["eslint-plugin-unused-imports"],
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
    },
  },
  plugins: lazyPlugins(() => [
    react(),
    command === "serve" ? vditorDevPlugin() : vditorProdBuildPlugin(),
  ]),
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      buffer: "buffer",
      stream: resolve(cwd, "src/react/shims/nodeStream.ts"),
      util: resolve(cwd, "src/react/shims/nodeUtil.ts"),
    },
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  server: {
    cors: {
      origin: true,
    },
    host: "127.0.0.1",
    port: 5739,
    fs: {
      allow: [".."],
    },
  },
  base: "",
  build: {
    outDir: "out/webview",
    chunkSizeWarningLimit: 2048,
  },
}));
