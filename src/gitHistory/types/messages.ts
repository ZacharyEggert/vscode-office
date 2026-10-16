import type { GitCommitStash } from "./git";

export type FileHistorySplitLayout = "vertical" | "horizontal";

/** Initial Git History state embedded in the webview's data-config. */
export interface GitHistoryEmbeddedInit {
  repos: string[];
  initialRepo: string | null;
  preferredRepo: string | null;
  filePath: string | null;
  fileName: string | null;
  relPath: string | null;
  fileHistorySplitLayout: FileHistorySplitLayout;
  viewColumn?: number;
}

export interface LoadRepoInfoPayload {
  readonly repo: string;
  readonly showRemoteBranches: boolean;
  readonly showStashes: boolean;
}

export interface LoadCommitsPayload {
  readonly repo: string;
  readonly branches: ReadonlyArray<string> | null;
  readonly maxCommits: number;
  readonly showTags: boolean;
  readonly showRemoteBranches: boolean;
  readonly includeCommitsMentionedByReflogs: boolean;
  readonly onlyFollowFirstParent: boolean;
  readonly commitOrdering: "date" | "author-date" | "topo";
  readonly remotes: ReadonlyArray<string>;
  readonly hideRemotes: ReadonlyArray<string>;
  readonly stashes: ReadonlyArray<import("./git").GitStash>;
  readonly author?: string;
  readonly searchValue?: string;
  readonly relPath?: string;
}

export interface CommitDetailsPayload {
  readonly repo: string;
  readonly commitHash: string;
  readonly hasParents: boolean;
  readonly stash?: GitCommitStash | null;
}
