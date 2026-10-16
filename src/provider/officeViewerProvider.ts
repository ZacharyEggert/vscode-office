import { ReactApp } from "@/service/reactApp";
import { getFileSuffix } from "@/common/fileSuffix";
import * as vscode from "vscode";
import { Handler } from "../common/handler";
import { onDocumentTextChange, rewriteWebviewResourcePaths } from "../common/webviewDocument";
import { bindImageViewer, isImage } from "./handlers/imageHandler";
import { bindSvgViewer } from "./handlers/svgHandler";
import { isVirtualUri, readUriText } from "./handlers/officeContent";
import { bindCommonEditorEvents } from "./handlers/commonHandler";
import { TelemetryService } from "@/service/telemetryService";
import {
  extensionResource,
  getExtensionResourceRoots,
  readExtensionText,
} from "@/common/extensionResource";

/**
 * support view office files
 */
export class OfficeViewerProvider implements vscode.CustomReadonlyEditorProvider {
  constructor(private context: vscode.ExtensionContext) {}

  bindCustomEditors(viewOption: { webviewOptions: vscode.WebviewPanelOptions }) {
    return [
      vscode.window.registerCustomEditorProvider("cweijan.officeViewer", this, viewOption),
      vscode.window.registerCustomEditorProvider("cweijan.htmlViewer", this, viewOption),
      vscode.window.registerCustomEditorProvider("cweijan.imageViewer", this, viewOption),
      vscode.window.registerCustomEditorProvider("cweijan.parquetViewer", this, viewOption),
    ];
  }

  public openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext,
    token: vscode.CancellationToken,
  ): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
    return { uri, dispose: (): void => {} };
  }
  public resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken,
  ): void | Thenable<void> {
    const uri = document.uri;
    const webview = webviewPanel.webview;
    const folderPath = vscode.Uri.joinPath(uri, "..");
    webview.options = {
      enableScripts: true,
      localResourceRoots: [...getExtensionResourceRoots(this.context), folderPath],
    };

    const handler = Handler.bind(webviewPanel, uri);

    let route: string | undefined;
    const suffix = getFileSuffix(uri.fsPath);
    const isSvg = /\.svg$/i.test(suffix);
    bindCommonEditorEvents(uri, handler, isSvg ? { skipOpen: true } : undefined);
    if (isSvg) {
      route = "svg";
      bindSvgViewer(handler, uri);
    } else if (isImage(suffix)) {
      bindImageViewer(handler, uri, webview);
      route = "image";
    }
    switch (suffix) {
      case ".xlsx":
      case ".xlsm":
      case ".xls":
      case ".csv":
      case ".tsv":
      case ".ods":
        route = "excel";
        break;
      case ".docx":
      case ".dotx":
        route = "word";
        break;
      case ".pptx":
      case ".pptm":
        route = "ppt";
        break;
      case ".ttf":
      case ".woff":
      case ".woff2":
      case ".otf":
        route = "font";
        break;
      case ".pdf":
        void this.loadPdfViewer(webview);
        break;
      case ".epub":
        route = "epub";
        break;
      case ".icns":
        route = "icns";
        break;
      case ".psd":
        route = "psd";
        break;
      case ".xmind":
        route = "xmind";
        break;
      case ".parquet":
        route = "parquet";
        break;
      case ".htm":
      case ".html":
      case ".xhtml":
        if (isVirtualUri(uri)) {
          void this.loadVirtualHtml(webviewPanel, uri, folderPath);
        } else {
          void this.loadWorkspaceHtml(webviewPanel, uri, folderPath);
        }
        break;
      default:
        if (route) break;
        vscode.commands.executeCommand("vscode.openWith", uri, "default");
    }
    const fileType = suffix.startsWith(".") ? suffix.slice(1) : suffix;
    TelemetryService.get()?.trackOfficeViewOpen(uri.fsPath, route, fileType);
    if (route) return ReactApp.view(webview, { route });
  }

  private async loadPdfViewer(webview: vscode.Webview) {
    const html = await readExtensionText(this.context, "resource", "pdf", "viewer.html");
    webview.html = html.replace("{{baseUrl}}", this.getBaseUrl(webview, "pdf"));
  }

  private async loadWorkspaceHtml(
    webviewPanel: vscode.WebviewPanel,
    uri: vscode.Uri,
    folderPath: vscode.Uri,
  ) {
    const webview = webviewPanel.webview;
    const render = async () => {
      const content = await readUriText(uri);
      webview.html = rewriteWebviewResourcePaths(content, webview, folderPath);
    };
    await render();
    onDocumentTextChange(webviewPanel, uri, () => {
      void render();
    });
  }

  private async loadVirtualHtml(
    webviewPanel: vscode.WebviewPanel,
    uri: vscode.Uri,
    folderPath: vscode.Uri,
  ) {
    try {
      const content = await readUriText(uri);
      webviewPanel.webview.html = rewriteWebviewResourcePaths(
        content,
        webviewPanel.webview,
        folderPath,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to read HTML";
      webviewPanel.webview.html = `<pre>${message}</pre>`;
    }
  }

  private getBaseUrl(webview: vscode.Webview, path: string) {
    const baseUrl = webview
      .asWebviewUri(extensionResource(this.context, "resource", path))
      .toString()
      .replace(/\?.+$/, "")
      .replace("https://git", "https://file");
    return baseUrl;
  }
}
