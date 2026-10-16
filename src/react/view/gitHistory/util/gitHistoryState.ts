import type { FileHistorySplitLayout } from "../../../../gitHistory/types/messages";
import { vscodeApi } from "../../../util/vscode";

export interface GitPullDefaults {
  noFastForward: boolean;
  squash: boolean;
}

const DEFAULT_PULL_DEFAULTS: GitPullDefaults = {
  noFastForward: false,
  squash: false,
};

export type { FileHistorySplitLayout };

export type GitHistoryColorMode = "adaptive" | "light";

const DEFAULT_COLOR_MODE: GitHistoryColorMode = "adaptive";
const COLOR_MODE_KEY = "office.gitHistory.colorMode";

const DEFAULT_FILE_HISTORY_SPLIT_LAYOUT: FileHistorySplitLayout = "vertical";

interface GitHistorySavedState {
  repo?: string;
  selectedBranch?: string | null;
  selectedAuthor?: string;
  searchValue?: string;
  selectedCommitHash?: string | null;
  filePath?: string | null;
  pullDefaultsByRepo?: Record<string, GitPullDefaults>;
  fileHistorySplitLayout?: FileHistorySplitLayout;
  colorMode?: GitHistoryColorMode;
}

export function loadGitHistoryState(): GitHistorySavedState {
  return (vscodeApi?.getState?.() as GitHistorySavedState | undefined) ?? {};
}

export function saveGitHistoryState(partial: GitHistorySavedState): void {
  if (!vscodeApi?.setState) return;
  const prev = (vscodeApi.getState?.() ?? {}) as GitHistorySavedState;
  vscodeApi.setState({ ...prev, ...partial });
}

export function getPullDefaults(repo: string): GitPullDefaults {
  const state = loadGitHistoryState();
  return state.pullDefaultsByRepo?.[repo] ?? DEFAULT_PULL_DEFAULTS;
}

export function savePullDefaults(repo: string, defaults: GitPullDefaults): void {
  const state = loadGitHistoryState();
  const pullDefaultsByRepo = { ...state.pullDefaultsByRepo, [repo]: defaults };
  saveGitHistoryState({ pullDefaultsByRepo });
}

export function getFileHistorySplitLayout(): FileHistorySplitLayout {
  const state = loadGitHistoryState();
  return state.fileHistorySplitLayout === "horizontal"
    ? "horizontal"
    : DEFAULT_FILE_HISTORY_SPLIT_LAYOUT;
}

export function saveFileHistorySplitLayout(layout: FileHistorySplitLayout): void {
  saveGitHistoryState({ fileHistorySplitLayout: layout });
}

export function getColorMode(): GitHistoryColorMode {
  try {
    const value = localStorage.getItem(COLOR_MODE_KEY);
    return value === "light" ? "light" : DEFAULT_COLOR_MODE;
  } catch {
    return DEFAULT_COLOR_MODE;
  }
}

export function saveColorMode(mode: GitHistoryColorMode): void {
  try {
    localStorage.setItem(COLOR_MODE_KEY, mode);
  } catch {}
}
