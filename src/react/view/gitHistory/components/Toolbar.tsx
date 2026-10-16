import type { MouseEvent } from "react";
import VscodeDropdown from "./VscodeDropdown";
import {
  FetchIcon,
  PullIcon,
  PushIcon,
  RefreshIcon,
  RemoteIcon,
  FindIcon,
  SettingsIcon,
  ThemeToggleIcon,
  ExpandLayoutIcon,
} from "./ToolbarIcons";

interface ToolbarProps {
  repos: string[];
  repo: string;
  branches: readonly string[];
  selectedBranch: string | null;
  authors: string[];
  selectedAuthor: string | undefined;
  searchValue: string;
  isRefreshing: boolean;
  isFetching: boolean;
  isPulling: boolean;
  isPushing: boolean;
  canPull: boolean;
  canPush: boolean;
  hasRemoteUrl: boolean;
  isFindActive: boolean;
  isSettingsActive: boolean;
  isSplitView: boolean;
  adaptiveColorMode: boolean;
  onRepoChange: (repo: string) => void;
  onBranchChange: (branch: string | null) => void;
  onAuthorChange: (author: string | undefined) => void;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onFetch: () => void;
  onPull: (event: MouseEvent<HTMLButtonElement>) => void;
  onPush: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpenRemote: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggleFind: () => void;
  onRefresh: () => void;
  onToggleSettings: () => void;
  onExpandLayout: () => void;
  onToggleColorMode: () => void;
}

function repoLabel(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || path;
}

export default function Toolbar({
  repos,
  repo,
  branches,
  selectedBranch,
  authors,
  selectedAuthor,
  searchValue,
  isRefreshing,
  isFetching,
  isPulling,
  isPushing,
  canPull,
  canPush,
  hasRemoteUrl,
  isFindActive,
  isSettingsActive,
  isSplitView,
  adaptiveColorMode,
  onRepoChange,
  onBranchChange,
  onAuthorChange,
  onSearchChange,
  onSearch,
  onFetch,
  onPull,
  onPush,
  onOpenRemote,
  onToggleFind,
  onRefresh,
  onToggleSettings,
  onExpandLayout,
  onToggleColorMode,
}: ToolbarProps) {
  const shouldShowRepo = repos.length > 1;
  const remoteOpClass = isFetching
    ? " git-graph-toolbar--fetching"
    : isPulling
      ? " git-graph-toolbar--pulling"
      : isPushing
        ? " git-graph-toolbar--pushing"
        : "";

  return (
    <div className={`git-graph-toolbar${shouldShowRepo ? "" : " single-repo"}${remoteOpClass}`}>
      <div className="git-graph-toolbar-search">
        <input
          type="text"
          className="vscode-input"
          placeholder="Enter to search commit"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
        />
      </div>

      <div className="git-graph-toolbar-filters">
        {shouldShowRepo && (
          <VscodeDropdown
            label="Repo:"
            options={repos.map((r) => ({ value: r, label: repoLabel(r), hint: r }))}
            value={repo}
            filterPlaceholder="Filter repositories..."
            showAllOption={false}
            onChange={(v) => {
              if (typeof v === "string" && v) onRepoChange(v);
            }}
          />
        )}
        <VscodeDropdown
          label="Branch:"
          options={branches.map((b) => ({ value: b, label: b }))}
          value={selectedBranch ?? ""}
          allLabel="All"
          filterPlaceholder="Filter branches..."
          onChange={(v) => onBranchChange(typeof v === "string" && v ? v : null)}
        />
        <VscodeDropdown
          label="Author"
          variant="toolbar"
          triggerLabel={selectedAuthor ? undefined : "Author"}
          options={authors.map((a) => ({ value: a, label: a }))}
          value={selectedAuthor ?? ""}
          allLabel="All"
          filterPlaceholder="Filter authors..."
          onChange={(v) => onAuthorChange(typeof v === "string" && v ? v : undefined)}
        />
      </div>

      <div className="git-graph-toolbar-actions">
        <RefreshIcon
          title="Refresh"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={isRefreshing ? " spinning" : ""}
        />
        <FetchIcon
          title="Fetch from remote(s)"
          onClick={onFetch}
          disabled={isFetching || isPushing || isPulling || !repo}
          className={isFetching ? "running" : undefined}
        />
        <PullIcon
          title="Pull current branch from remote"
          onClick={onPull}
          disabled={isPulling || isPushing || isFetching || !canPull}
          className={isPulling ? "running" : undefined}
        />
        <PushIcon
          title="Push current branch to remote"
          onClick={onPush}
          disabled={isPushing || isFetching || isPulling || !canPush}
          className={isPushing ? "running" : undefined}
        />
        <RemoteIcon
          title={hasRemoteUrl ? "Open remote repository" : "No remote URL configured"}
          onClick={onOpenRemote}
          disabled={!repo || !hasRemoteUrl}
        />
      </div>

      <div className="git-graph-toolbar-tools">
        {isSplitView && (
          <ExpandLayoutIcon title="Expand to single editor layout" onClick={onExpandLayout} />
        )}
        <ThemeToggleIcon adaptive={adaptiveColorMode} onClick={onToggleColorMode} />
        <FindIcon
          title="Find in commit history (Ctrl+F)"
          onClick={onToggleFind}
          className={isFindActive ? "active" : undefined}
          disabled={!repo}
        />
        <SettingsIcon
          title="Repository settings"
          onClick={onToggleSettings}
          className={isSettingsActive ? "active" : undefined}
          disabled={!repo}
        />
      </div>
    </div>
  );
}
