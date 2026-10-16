import { Output } from "@/common/Output";
import { Handler } from "@/common/handler";
import {
  assertSafeArchiveEntryPaths,
  planExtractTarget,
  resolveContainedPath,
  revealExtractResult,
} from "@/service/compress/archiveUtils";
import { buildFileTree } from "@/service/compress/fileTree";
import prettyBytes from "@/service/compress/pretty-bytes";
import iconv from "iconv-lite";
import { mkdirSync } from "fs";
import { basename, dirname, parse, relative, sep } from "path";
import SevenZip from "7z-wasm";
import { i18n } from "@/common/global";
import { Uri, commands, window, workspace } from "vscode";
import { prepareDecompressTarget } from "./decompressHandler";

function applyPassword(current: string | undefined, input?: string) {
  return input !== undefined ? input.trim() || undefined : current;
}

interface SevenZipEntry {
  path: string;
  fileSize: number;
  compressedSize: number;
  isDirectory: boolean;
  modifyDateTime?: string | null;
}

export async function bindSevenZipViewer(uri: Uri, handler: Handler) {
  const decompressPath = prepareDecompressTarget(uri, handler);
  let archivePassword: string | undefined;
  let filenameEncoding: string | undefined;

  handler.on("changeEncoding", (encoding: string) => {
    filenameEncoding = encoding;
    handler.emit("init");
  });

  handler.on("init", async () => {
    const stat = await workspace.fs.stat(uri);

    try {
      const { entries, encrypted: isEncrypted } = await listSevenZipEntries(
        uri.fsPath,
        archivePassword,
        filenameEncoding,
      );
      const { files, folderMap, filePaths } = buildFileTree(entries);

      handler.emit("encrypted", isEncrypted);
      handler.emit("size", prettyBytes(stat.size));
      handler.emit("extension", "7z");
      handler.emit("data", {
        files,
        folderMap,
        fileName: basename(uri.fsPath),
      });

      handler
        .on("openPath", async (payload) => {
          const entry = payload?.entry ?? payload;
          const { entryName, isDirectory } = entry;
          archivePassword = applyPassword(archivePassword, payload?.password);

          if (isDirectory) {
            handler.emit("openDir", entryName);
            return;
          }
          if (isEncrypted && !archivePassword) return;

          await commands.executeCommand("workbench.action.keepEditor");
          const tempPath = resolveContainedPath(decompressPath, entryName);
          const success = await extractSevenZipEntries(
            uri.fsPath,
            decompressPath,
            [entryName],
            archivePassword,
            filenameEncoding,
          );
          if (success) {
            commands.executeCommand("vscode.open", Uri.file(tempPath));
          } else if (archivePassword && isEncrypted) {
            archivePassword = undefined;
            handler.emit("passwordError");
          }
        })
        .on("autoExtract", async (inputPassword?: string) => {
          archivePassword = applyPassword(archivePassword, inputPassword);
          if (isEncrypted && !archivePassword) return;

          window.showInformationMessage(i18n("ext.compress.startExtract"));
          const plan = planExtractTarget(uri.fsPath, files.length);
          if (plan.createSubfolder) {
            mkdirSync(plan.targetDir, { recursive: true });
          }
          const success = await extractSevenZipEntries(
            uri.fsPath,
            plan.targetDir,
            undefined,
            archivePassword,
            filenameEncoding,
            filePaths,
          );
          if (success) {
            window.showInformationMessage(i18n("ext.compress.extractSuccess"));
            await revealExtractResult(plan, filePaths);
          } else if (archivePassword && isEncrypted) {
            archivePassword = undefined;
            handler.emit("passwordError");
          }
        });
    } catch (err) {
      Output.debug(err);
      if (isSevenZipPasswordError(err)) {
        window.showErrorMessage(
          archivePassword
            ? i18n("ext.compress.wrongPassword")
            : i18n("ext.compress.passwordProtected"),
        );
      } else {
        window.showErrorMessage((err as Error).message);
      }
    }
  });
}

async function listSevenZipEntries(archivePath: string, password?: string, encoding?: string) {
  const stdout = await runSevenZipCommand(
    dirname(archivePath),
    [
      "l",
      "-slt",
      "-ba",
      ...getSevenZipCharsetArgs(encoding),
      ...(password ? [`-p${password}`] : []),
      basename(archivePath),
    ],
    encoding,
  );
  // 7z-wasm stdout omits the dash separators between entries, so split on each "Path = " line.
  const blocks = stdout.split(/\r?\n(?=Path = )/);
  const entries: SevenZipEntry[] = [];
  let isEncrypted = false;

  for (const block of blocks) {
    const entryFields: Record<string, string> = {};
    for (const line of block.split(/\r?\n/)) {
      const match = line.match(/^([^=]+) = (.*)$/);
      if (match) {
        entryFields[match[1].trim()] = match[2].trim();
      }
    }

    if (!entryFields.Path) {
      continue;
    }

    const path = entryFields.Path.replace(/\\/g, "/");
    const isDirectory =
      entryFields.Folder === "+" ||
      path.endsWith("/") ||
      /^D(\s|$)/.test(entryFields.Attributes ?? "");

    if (!isDirectory && entryFields.Size === undefined) {
      continue;
    }

    const fileSize = Number(entryFields.Size ?? 0);
    const compressedSize = Number(entryFields["Packed Size"] ?? entryFields.Size ?? 0);

    isEncrypted = isEncrypted || entryFields.Encrypted === "+";
    entries.push({
      path: isDirectory && !path.endsWith("/") ? `${path}/` : path,
      fileSize,
      compressedSize,
      isDirectory,
      modifyDateTime: entryFields.Modified ?? null,
    });
  }

  return { entries, encrypted: isEncrypted };
}

async function extractSevenZipEntries(
  archivePath: string,
  targetPath: string,
  entryNames?: string[],
  password?: string,
  encoding?: string,
  pathsToValidate?: string[],
) {
  try {
    assertSafeArchiveEntryPaths(targetPath, pathsToValidate ?? entryNames ?? []);
    mkdirSync(targetPath, { recursive: true });
    const args = [
      "x",
      "-y",
      "-aoa",
      ...getSevenZipCharsetArgs(encoding),
      ...(password ? [`-p${password}`] : []),
      `-o${toMountedPath(parse(archivePath).root, targetPath)}`,
      basename(archivePath),
      ...(entryNames ?? []),
    ];
    await runSevenZipCommand(dirname(archivePath), args, encoding);
    return true;
  } catch (err) {
    Output.debug(err);
    if (password && isSevenZipPasswordError(err)) {
      window.showErrorMessage(i18n("ext.compress.wrongPassword"));
    } else if (!password && isSevenZipPasswordError(err)) {
      return false;
    } else {
      window.showErrorMessage((err as Error).message);
    }
    return false;
  }
}

async function runSevenZipCommand(cwd: string, args: string[], encoding?: string) {
  const stdoutBytes: number[] = [];
  const stderrBytes: number[] = [];
  const module = await SevenZip({
    stdout: (charCode) => {
      if (charCode !== null) {
        stdoutBytes.push(charCode);
      }
    },
    stderr: (charCode) => {
      if (charCode !== null) {
        stderrBytes.push(charCode);
      }
    },
  });

  const hostRoot = parse(cwd).root;
  const mountRoot = "/nodefs";
  const mountedCwd = toMountedPath(hostRoot, cwd);

  module.FS.mkdir(mountRoot);
  module.FS.mount(module.NODEFS, { root: hostRoot }, mountRoot);
  module.FS.chdir(mountedCwd);

  try {
    module.callMain(args);
  } catch (err) {
    const stderr = decodeSevenZipOutput(stderrBytes, encoding);
    const stdout = decodeSevenZipOutput(stdoutBytes, encoding);
    throw new Error(stderr.trim() || stdout.trim() || (err as Error).message);
  }

  return decodeSevenZipOutput(stdoutBytes, encoding);
}

function getSevenZipCharsetArgs(encoding?: string) {
  if (!encoding || encoding === "utf8") {
    return ["-sccUTF-8", "-scsUTF-8"];
  }
  return ["-sccUTF-8", "-scsWIN"];
}

function decodeSevenZipOutput(bytes: number[], encoding?: string) {
  const buffer = Buffer.from(bytes);
  if (!encoding || encoding === "utf8") {
    return buffer.toString("utf8");
  }
  return iconv.decode(buffer, encoding);
}

function toMountedPath(root: string, fsPath: string) {
  const mounted = relative(root, fsPath).split(sep).join("/");
  return mounted ? `/nodefs/${mounted}` : "/nodefs";
}

function isSevenZipPasswordError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return /password|encrypted|headers error/i.test(message);
}
