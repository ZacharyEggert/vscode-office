// Host-owned contracts; webview re-exports so the two can't drift.
export type {
  GitCommit,
  GitCommitDetails,
  GitCommitDetailsData,
  GitCommitData,
  GitCommitRemote,
  GitCommitStash,
  GitCommitTag,
  GitFileChange,
  GitRepoInfo,
  GitStash,
} from "../../../gitHistory/types/git";
export type { GitRemoteDetail } from "../../../gitHistory/types/repoConfig";
export type { GitHistoryEmbeddedInit as GitHistoryInitPayload } from "../../../gitHistory/types/messages";

export interface GitRepoExtras {
  authors: string[];
  hasRemoteUrl: boolean;
  remoteWebUrls: { name: string; url: string }[];
}
