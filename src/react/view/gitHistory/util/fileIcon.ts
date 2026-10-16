export function getChangeIconPath(change: {
  type: string;
  oldFilePath: string;
  newFilePath: string;
}): string {
  if (change.type === "D") {
    return change.oldFilePath;
  }
  return change.newFilePath;
}

/** Indent per tree depth (px). */
const CDV_TREE_INDENT = 16;

const CDV_ROW_BASE_PADDING = 4;

export function fileRowPaddingLeft(depth: number): number {
  return CDV_ROW_BASE_PADDING + depth * CDV_TREE_INDENT;
}

export function folderRowPaddingLeft(depth: number): number {
  return CDV_ROW_BASE_PADDING + depth * CDV_TREE_INDENT;
}
