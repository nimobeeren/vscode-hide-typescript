import * as vscode from "vscode";
import { transform } from "./transform";

const uriScheme = "hide-typescript";
const transformedDocumentSuffix = " (transformed)";

const watchingDocuments = new Set<vscode.TextDocument>();

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.hideTypeScript", hideTypeScript)
  );

  vscode.workspace.onDidChangeTextDocument(async event => {
    if (watchingDocuments.has(event.document)) {
      // One of the documents we're watching has changed, so let's see if we can
      // update the transformed document

      /// Find the editor that contains the transformed document
      const transformedDocumentName =
        event.document.fileName + transformedDocumentSuffix;
      const transformedDocumentEditor = findEditorByDocumentName(
        transformedDocumentName
      );

      if (!transformedDocumentEditor) {
        // Transformed document is not open anymore, so stop watching this document
        watchingDocuments.delete(event.document);
        return;
      }

      // Transform the changed document
      let newTransformedDocument;
      try {
        newTransformedDocument = await getTransformedDocument(event.document);
      } catch (e) {
        const message = e.message || `Unknown error: ${e.toString()}`;
        vscode.window.showErrorMessage(message);
        return;
      }

      vscode.window.showTextDocument(newTransformedDocument);
    }
  });

  const TransformedCodeProvider = class
    implements vscode.TextDocumentContentProvider {
    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
      // Naively escape suffix string for use in regex
      // This will break when suffix contains symbols reserved by regex other than ) and (
      const escapedSuffix = transformedDocumentSuffix
        .replace("(", "\\(")
        .replace(")", "\\)");

      const sourceDocumentName = uri.path.replace(
        new RegExp(`${escapedSuffix}$`),
        ""
      );

      // Find the editor that contains the source document
      const sourceEditor = findEditorByDocumentName(sourceDocumentName);
      if (!sourceEditor) {
        throw new Error("Couldn't find the source editor");
      }

      // Get the source code from the editor
      const sourceCode = sourceEditor.document.getText();

      // Transform the code to regular JS
      const transformedCode = await transform(sourceCode);
      if (!transformedCode) {
        throw new Error("Unable to transform code");
      }
      return transformedCode;
    }
  };

  // Register our provider to handle URIs with our scheme
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      uriScheme,
      new TransformedCodeProvider()
    )
  );
}

function findEditorByDocumentName(name: string): vscode.TextEditor | undefined {
  return vscode.window.visibleTextEditors.find(editor => {
    return editor.document.fileName === name;
  });
}

async function getTransformedDocument(
  sourceDocument: vscode.TextDocument
): Promise<vscode.TextDocument> {
  // Get transformed code using our provider
  // The URI path identifies the source document, but will also be the name
  // of the transformed document. Hence, we add a suffix to let the user distinguish them
  const path = `${sourceDocument.fileName}${transformedDocumentSuffix}`;
  const uri = vscode.Uri.parse(`${uriScheme}:${path}`, true);
  const plainDocument = await vscode.workspace.openTextDocument(uri);

  // Set language to JS
  const jsDocument = await vscode.languages.setTextDocumentLanguage(
    plainDocument,
    "javascript"
  );

  return jsDocument;
}

async function hideTypeScript() {
  const { activeTextEditor } = vscode.window;
  if (!activeTextEditor) {
    vscode.window.showErrorMessage("Couldn't find an active editor");
    return;
  }

  const sourceDocument = activeTextEditor.document;
  watchingDocuments.add(sourceDocument);

  let transformedDocument;
  try {
    transformedDocument = await getTransformedDocument(sourceDocument);
  } catch (e) {
    const message = e.message || `Unknown error: ${e.toString()}`;
    vscode.window.showErrorMessage(message);
    return;
  }

  vscode.window.showTextDocument(transformedDocument);
  vscode.window.showInformationMessage("Transformed code");
}
