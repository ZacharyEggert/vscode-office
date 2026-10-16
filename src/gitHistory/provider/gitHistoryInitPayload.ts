import type * as vscode from "vscode";
import type { RepoDiscovery } from "../service/repoDiscovery";
import type { GitHistoryPanelContext } from "./gitHistoryPanelContext";
import { getRelativeRepoPath } from "../util/repoPath";
import { resolvePreferredRepo } from "./resolveGitHistoryCommandContext";
import { getFileHistorySplitLayout } from "../util/gitHistoryPreferences";
import type { GitHistoryEmbeddedInit } from "../types/messages";

function resolveInitialRepo(
  repoDiscovery: RepoDiscovery,
  panelContext: GitHistoryPanelContext,
): string | null {
  const preferred = resolvePreferredRepo(panelContext, repoDiscovery);
  if (preferred) {
    return preferred;
  }
  return repoDiscovery.getInitialRepo();
}

export function buildGitHistoryInitPayload(
  extensionContext: vscode.ExtensionContext,
  repoDiscovery: RepoDiscovery,
  panelContext: GitHistoryPanelContext,
  viewColumn?: number,
): GitHistoryEmbeddedInit {
  const preferredRepo = resolvePreferredRepo(panelContext, repoDiscovery);
  const initialRepo = resolveInitialRepo(repoDiscovery, panelContext);
  const filePath = panelContext.fileUri?.fsPath ?? null;
  const relPath = initialRepo && filePath ? getRelativeRepoPath(initialRepo, filePath) : null;
  return {
    repos: repoDiscovery.getRepos(),
    initialRepo,
    preferredRepo,
    filePath,
    fileName: filePath ? (filePath.split(/[/\\]/).pop() ?? null) : null,
    relPath,
    fileHistorySplitLayout: getFileHistorySplitLayout(extensionContext),
    viewColumn,
  };
}
