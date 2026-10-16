import { copyFileSync, cpSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, watch, type BuildOptions, type Plugin } from "vite/rolldown";

const __dirname = dirname(fileURLToPath(import.meta.url));

const isProd = process.argv.indexOf("--mode=production") >= 0;
const devExtensionTarget = process.env.OFFICE_EXTENSION_TARGET;

// Production always builds both; dev builds one target at a time.
const buildDesktop = isProd || devExtensionTarget !== "web";
const buildWeb = isProd || devExtensionTarget === "web";

const dependencies = ["vscode-html-to-docx", "highlight.js", "pdf-lib", "katex", "puppeteer-core"];
const nodeBuiltinStubs = [
  "fs",
  "child_process",
  "os",
  "crypto",
  "stream",
  "https",
  "http",
  "net",
  "tls",
  "zlib",
  "events",
  "util",
  "buffer",
  "module",
  "url",
  "assert",
  "string_decoder",
];

function createDesktopAssetCopyPlugin(): Plugin {
  const templateDir = resolve(__dirname, "template");
  const wasmFiles = [
    "node_modules/node-unrar-js/dist/js/unrar.wasm",
    "node_modules/7z-wasm/7zz.wasm",
  ];
  return {
    name: "copy-desktop-assets",
    buildStart() {
      for (const file of readdirSync(templateDir, { recursive: true, encoding: "utf-8" })) {
        this.addWatchFile(resolve(templateDir, file));
      }
    },
    writeBundle() {
      cpSync(templateDir, "out", { recursive: true });
      for (const file of wasmFiles) {
        copyFileSync(file, `out/${basename(file)}`);
      }
    },
  };
}

function createNodeShimPlugin(): Plugin {
  const shimDir = resolve(__dirname, "src/shims");
  const packageStubs: Record<string, string> = {
    "puppeteer-core": "puppeteer-core.ts",
    "chrome-finder": "chrome-finder.ts",
    "file-type": "file-type.ts",
  };
  const stubOrEmpty = (name: string) => {
    const stubPath = resolve(shimDir, `${name}.ts`);
    return existsSync(stubPath) ? stubPath : resolve(shimDir, "empty-stub.ts");
  };
  return {
    name: "node-shim",
    resolveId(source) {
      if (source === "path" || source === "node:path") {
        return resolve(shimDir, "path.ts");
      }
      if (/markdown[\\/](markdown-pdf(\.js)?|html-export\.js)$/.test(source)) {
        return resolve(shimDir, "markdown-pdf.ts");
      }
      if (packageStubs[source]) {
        return resolve(shimDir, packageStubs[source]);
      }
      if (nodeBuiltinStubs.includes(source)) {
        return stubOrEmpty(source);
      }
      if (source.startsWith("node:")) {
        const bare = source.slice(5);
        return bare === "fs/promises" ? resolve(shimDir, "fs.ts") : stubOrEmpty(bare);
      }
    },
  };
}

function createBuildNoticePlugin(): Plugin {
  return {
    name: "build notice",
    buildStart() {
      console.log("build start");
    },
    writeBundle() {
      console.log("build success");
    },
  };
}

// esbuild-style externals: a bare name also covers its subpaths
const isExternal = (names: string[]) => (id: string) =>
  names.some((name) => id === name || id.startsWith(`${name}/`));

async function runBuild(shouldWatch: boolean, options: BuildOptions) {
  if (shouldWatch) {
    const watcher = watch(options);
    watcher.on("event", (event) => {
      if (event.code === "ERROR") {
        console.error(event.error);
      }
      if ("result" in event) {
        void event.result?.close();
      }
    });
    return watcher;
  }
  return build(options);
}

function buildDesktopExtension() {
  const shouldWatch = !isProd && devExtensionTarget !== "web";
  return runBuild(shouldWatch, {
    input: "./src/extension.ts",
    platform: "node",
    external: isExternal(["vscode", ...dependencies]),
    output: {
      file: "out/extension.js",
      format: "cjs",
      codeSplitting: false,
      minify: isProd,
      sourcemap: !isProd,
    },
    plugins: [createDesktopAssetCopyPlugin(), createBuildNoticePlugin()],
  });
}

function buildWebExtension() {
  const shouldWatch = !isProd && devExtensionTarget === "web";
  return runBuild(shouldWatch, {
    input: "./src/extension.web.ts",
    platform: "browser",
    // stubbed packages must reach the shim plugin, not be externalized first
    external: isExternal(["vscode", ...dependencies.filter((name) => name !== "puppeteer-core")]),
    transform: { target: "es2021" },
    output: {
      file: "out/extension.web.js",
      format: "cjs",
      codeSplitting: false,
      minify: isProd,
      sourcemap: !isProd,
      banner:
        'var global = globalThis; var Buffer = globalThis.Buffer || { from: (value, encoding) => encoding === "binary" ? Uint8Array.from(value, (c) => c.charCodeAt(0)) : new TextEncoder().encode(String(value)) };',
    },
    plugins: [createNodeShimPlugin(), createBuildNoticePlugin()],
  });
}

async function createLib() {
  if (!buildDesktop) {
    return;
  }
  const points = dependencies.reduce(
    (point, dependency) => {
      const pkgPath = resolve(`./node_modules/${dependency}/package.json`);
      const main = JSON.parse(readFileSync(pkgPath, "utf-8")).main ?? "index.js";
      const mainAbsPath = resolve(`./node_modules/${dependency}`, main);
      if (existsSync(mainAbsPath)) {
        point[dependency] = mainAbsPath;
      }
      return point;
    },
    {} as Record<string, string>,
  );
  // one build per package: a multi-input build would split shared code into chunks
  await Promise.all(
    Object.entries(points).map(([name, input]) =>
      build({
        input,
        platform: "node",
        output: {
          file: `out/node_modules/${name}.js`,
          format: "cjs",
          codeSplitting: false,
          exports: "named",
          minify: true,
        },
      }),
    ),
  );
}

(async () => {
  try {
    if (buildDesktop) {
      await createLib();
      await buildDesktopExtension();
    }
    if (buildWeb) {
      await buildWebExtension();
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
