import { Output } from "@/common/Output";
import { Handler } from "@/common/handler";
import {
  planExtractTarget,
  resolveContainedPath,
  revealExtractResult,
} from "@/service/compress/archiveUtils";
import { buildFileTree } from "@/service/compress/fileTree";
import {
  extractTarEntries,
  formatTarModifyTime,
  listTarEntries,
} from "@/service/compress/tarUtils";
import prettyBytes from "@/service/compress/pretty-bytes";
import { mkdirSync } from "fs";
import { basename } from "path";
import { i18n } from "@/common/global";
import { Uri, commands, window, workspace } from "vscode";
import { prepareDecompressTarget } from "./decompressHandler";

export async function bindTarViewer(uri: Uri, handler: Handler, gzip = true) {
  const decompressPath = prepareDecompressTarget(uri, handler);
  handler.on("init", async () => {
    const archiveBytes = (await workspace.fs.readFile(uri)) as Buffer;
    const tarEntries = await listTarEntries(archiveBytes, gzip);
    const items = tarEntries.map((entry) => ({
      path: entry.path,
      fileSize: entry.size,
      compressedSize: entry.size,
      isDirectory: entry.isDirectory,
      modifyDateTime: formatTarModifyTime(entry.mtime),
    }));
    const { files, folderMap, filePaths } = buildFileTree(items);

    handler.emit("size", prettyBytes(archiveBytes.length));
    handler.emit("extension", gzip ? "tar.gz" : "tar");
    handler.emit("data", {
      files,
      folderMap,
      fileName: basename(uri.fsPath),
    });

    handler
      .on("openPath", async (payload) => {
        const entry = payload?.entry ?? payload;
        const { entryName, isDirectory } = entry;

        if (isDirectory) {
          handler.emit("openDir", entryName ?? "");
          return;
        }

        await commands.executeCommand("workbench.action.keepEditor");
        const tempPath = resolveContainedPath(decompressPath, entryName);
        try {
          await extractTarEntries(archiveBytes, decompressPath, gzip, [entryName]);
          commands.executeCommand("vscode.open", Uri.file(tempPath));
        } catch (err) {
          Output.debug(err);
          window.showErrorMessage((err as Error).message);
        }
      })
      .on("autoExtract", async () => {
        window.showInformationMessage(i18n("ext.compress.startExtract"));
        const plan = planExtractTarget(uri.fsPath, files.length);
        if (plan.createSubfolder) {
          mkdirSync(plan.targetDir, { recursive: true });
        }
        try {
          await extractTarEntries(archiveBytes, plan.targetDir, gzip);
          window.showInformationMessage(i18n("ext.compress.extractSuccess"));
          await revealExtractResult(plan, filePaths);
        } catch (err) {
          Output.debug(err);
          window.showErrorMessage((err as Error).message);
        }
      });
  });
}
