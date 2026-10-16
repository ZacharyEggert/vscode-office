import { useEffect, useMemo, useRef, useState } from "react";
import type { GitCommit } from "../types";
import { findCommitMatches } from "../util/findCommits";

interface FindWidgetProps {
  isOpen: boolean;
  commits: readonly GitCommit[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number | null) => void;
}

export default function FindWidget({
  isOpen,
  commits,
  currentIndex,
  onClose,
  onNavigate,
}: FindWidgetProps) {
  const [text, setText] = useState("");
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isRegexEnabled, setIsRegexEnabled] = useState(false);
  const onNavigateRef = useRef(onNavigate);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  const matches = useMemo(() => {
    const matchResult = findCommitMatches(commits, text, isCaseSensitive, isRegexEnabled);
    if (matchResult.error) {
      return { indices: [] as number[], error: matchResult.error };
    }
    return { indices: matchResult.indices, error: null };
  }, [commits, text, isCaseSensitive, isRegexEnabled]);

  const regexError = matches.error;

  if (!isOpen) return null;

  const updateSearch = (nextText: string, nextCaseSensitive: boolean, nextUseRegex: boolean) => {
    const nextMatches = findCommitMatches(commits, nextText, nextCaseSensitive, nextUseRegex);
    if (!nextText.trim() || nextMatches.error || nextMatches.indices.length === 0) {
      onNavigateRef.current(null);
      return;
    }
    onNavigateRef.current(nextMatches.indices[0]);
  };

  const navigateMatch = (direction: 1 | -1) => {
    if (matches.indices.length === 0) return;
    const currentPos =
      currentIndex !== null && matches.indices.includes(currentIndex)
        ? matches.indices.indexOf(currentIndex)
        : 0;
    const nextPos =
      (((currentPos + direction) % matches.indices.length) + matches.indices.length) %
      matches.indices.length;
    onNavigate(matches.indices[nextPos]);
  };

  const activePosition =
    currentIndex !== null && matches.indices.includes(currentIndex)
      ? matches.indices.indexOf(currentIndex)
      : matches.indices.length > 0
        ? 0
        : -1;

  const hasNoResults = !regexError && text.trim() !== "" && matches.indices.length === 0;
  const positionLabel = regexError
    ? "Invalid regex"
    : matches.indices.length > 0 && activePosition >= 0
      ? `${activePosition + 1} of ${matches.indices.length}`
      : "No Results";

  return (
    <div className={`git-graph-find-widget${regexError ? " error" : ""}`} role="search">
      <div className="git-graph-find-input-group">
        <input
          type="text"
          className="vscode-input git-graph-find-input"
          placeholder="Find"
          value={text}
          autoFocus
          onChange={(e) => {
            const nextText = e.target.value;
            setText(nextText);
            updateSearch(nextText, isCaseSensitive, isRegexEnabled);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              navigateMatch(e.shiftKey ? -1 : 1);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
        />
        <div className="git-graph-find-modifiers">
          <button
            type="button"
            className={`git-graph-find-modifier${isCaseSensitive ? " active" : ""}`}
            title="Match Case"
            onClick={() => {
              const next = !isCaseSensitive;
              setIsCaseSensitive(next);
              updateSearch(text, next, isRegexEnabled);
            }}
          >
            Aa
          </button>
          <button
            type="button"
            className={`git-graph-find-modifier${isRegexEnabled ? " active" : ""}`}
            title="Use Regular Expression"
            onClick={() => {
              const next = !isRegexEnabled;
              setIsRegexEnabled(next);
              updateSearch(text, isCaseSensitive, next);
            }}
          >
            .*
          </button>
        </div>
      </div>
      <span
        className={`git-graph-find-position${hasNoResults ? " no-results" : ""}`}
        title={regexError ?? undefined}
      >
        {positionLabel}
      </span>
      <button
        type="button"
        className="git-graph-icon-btn"
        title="Previous match (Shift+Enter)"
        disabled={matches.indices.length === 0}
        onClick={() => navigateMatch(-1)}
      >
        <span className="codicon codicon-arrow-up" aria-hidden />
      </button>
      <button
        type="button"
        className="git-graph-icon-btn"
        title="Next match (Enter)"
        disabled={matches.indices.length === 0}
        onClick={() => navigateMatch(1)}
      >
        <span className="codicon codicon-arrow-down" aria-hidden />
      </button>
      <button type="button" className="git-graph-icon-btn" title="Close (Escape)" onClick={onClose}>
        <span className="codicon codicon-close" aria-hidden />
      </button>
    </div>
  );
}
