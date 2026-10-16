import { useEffect, useState } from "react";
import { handler } from "../../../util/vscode";
import { isSplitViewLayout } from "../util/splitViewLayout";

export function useSplitViewLayout(initialViewColumn?: number): boolean {
  const [viewColumn, setViewColumn] = useState(initialViewColumn);
  const [isSplitView, setIsSplitView] = useState(() =>
    isSplitViewLayout(window.innerHeight, initialViewColumn),
  );

  useEffect(() => {
    handler.on("viewColumn", (content) => {
      const column = (content as { viewColumn?: number })?.viewColumn;
      if (typeof column === "number") {
        setViewColumn(column);
      }
    });
  }, []);

  useEffect(() => {
    const updateSplitView = () => {
      setIsSplitView(isSplitViewLayout(window.innerHeight, viewColumn));
    };
    updateSplitView();
    window.addEventListener("click", updateSplitView);
    window.addEventListener("focus", updateSplitView);
    return () => {
      window.removeEventListener("click", updateSplitView);
      window.removeEventListener("focus", updateSplitView);
    };
  }, [viewColumn]);

  return isSplitView;
}
