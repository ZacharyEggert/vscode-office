import * as vscode from "vscode";

const EXTENSION_HOST_WEB_CONTEXT = "office.extensionHost.web";

let isRunningInWebHost = false;

export function setExtensionHostContext(): void {
  isRunningInWebHost = true;
  void vscode.commands.executeCommand("setContext", EXTENSION_HOST_WEB_CONTEXT, true);
}

export function isWebExtensionHost(): boolean {
  return isRunningInWebHost;
}
