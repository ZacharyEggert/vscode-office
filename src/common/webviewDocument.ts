import * as vscode from "vscode";

export function rewriteWebviewResourcePaths(
  html: string,
  webview: vscode.Webview,
  contextPath: string | vscode.Uri,
): string {
  const baseUri = typeof contextPath === "string" ? vscode.Uri.file(contextPath) : contextPath;
  return html
    .replace(/((src|href)=("|')?)(\/\/)/gi, "$1http://")
    .replace(
      /((src|href)=("|'))((?!(?:https?:|#|data:|mailto:|javascript:|blob:)).+?["'])/gi,
      "$1" + webview.asWebviewUri(baseUri) + "/$4",
    );
}

export function onDocumentTextChange(
  webviewPanel: vscode.WebviewPanel,
  uri: vscode.Uri,
  callback: () => void,
) {
  const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
    if (e.document.uri.toString() === uri.toString()) {
      callback();
    }
  });
  webviewPanel.onDidDispose(() => {
    changeDocumentSubscription.dispose();
  });
}
