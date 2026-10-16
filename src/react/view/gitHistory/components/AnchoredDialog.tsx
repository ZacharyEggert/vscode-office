import type { ReactNode } from "react";
import { Spin } from "antd";
import type { AnchoredDialogPositionVariant, PopupAnchor } from "../util/commitDetailPopup";
import { useAnchoredDialogPosition } from "../hooks/useAnchoredDialogPosition";

interface AnchoredDialogProps {
  anchor?: PopupAnchor | null;
  ariaLabel: string;
  repositionDeps?: unknown[];
  centerOffsetY?: number;
  positionVariant?: AnchoredDialogPositionVariant;
  compact?: boolean;
  children: ReactNode;
}

export function AnchoredDialog({
  anchor,
  ariaLabel,
  repositionDeps = [],
  centerOffsetY = 0,
  positionVariant = "default",
  compact = false,
  children,
}: AnchoredDialogProps) {
  const dialogRef = useAnchoredDialogPosition(
    anchor,
    repositionDeps,
    centerOffsetY,
    positionVariant,
  );

  return (
    <div
      ref={dialogRef}
      className={`git-graph-anchored-dialog${compact ? " compact" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="git-graph-anchored-dialog-content">{children}</div>
    </div>
  );
}

interface AnchoredDialogActionsProps {
  primaryLabel: string;
  onPrimary: () => void;
  isPrimaryDisabled?: boolean;
  isPrimaryDanger?: boolean;
  isLoading?: boolean;
  onCancel: () => void;
  cancelLabel?: string;
}

export function AnchoredDialogActions({
  primaryLabel,
  onPrimary,
  isPrimaryDisabled = false,
  isPrimaryDanger = false,
  isLoading = false,
  onCancel,
  cancelLabel = "Cancel",
}: AnchoredDialogActionsProps) {
  return (
    <div className="git-graph-anchored-dialog-actions">
      <button
        type="button"
        className={`git-graph-anchored-dialog-btn primary${isPrimaryDanger ? " danger" : ""}`}
        disabled={isPrimaryDisabled || isLoading}
        onClick={onPrimary}
        style={isLoading ? { display: "inline-flex", alignItems: "center", gap: 6 } : undefined}
      >
        {isLoading && <Spin size="small" />}
        {primaryLabel}
      </button>
      <button
        type="button"
        className="git-graph-anchored-dialog-btn"
        onClick={onCancel}
        disabled={isLoading}
      >
        {cancelLabel}
      </button>
    </div>
  );
}
