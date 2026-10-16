import * as vscode from "vscode";
import type { FileHistorySplitLayout } from "../types/messages";

const FILE_HISTORY_SPLIT_LAYOUT_KEY = "office.gitHistory.fileSplitLayout";

export function getFileHistorySplitLayout(
  context: vscode.ExtensionContext,
): FileHistorySplitLayout {
  const value = context.globalState.get<FileHistorySplitLayout>(FILE_HISTORY_SPLIT_LAYOUT_KEY);
  return value === "horizontal" ? "horizontal" : "vertical";
}

export async function setFileHistorySplitLayout(
  context: vscode.ExtensionContext,
  layout: FileHistorySplitLayout,
): Promise<void> {
  await context.globalState.update(FILE_HISTORY_SPLIT_LAYOUT_KEY, layout);
}
