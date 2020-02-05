import * as vscode from "vscode";
import { transform } from "./transform";

const myScheme = "hide-typescript";
const transformedDocumentSuffix = " (transformed)";

const watchingDocuments = new Set<vscode.TextDocument>();

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.hideTypeScript", hideTypeScript)
  );

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
      myScheme,
      new TransformedCodeProvider()
    )
  );
}

function findEditorByDocumentName(name: string): vscode.TextEditor | undefined {
  return vscode.window.visibleTextEditors.find(editor => {
    return editor.document.fileName === name;
  });
}

async function getTransformedDoc(
  sourceDocument: vscode.TextDocument
): Promise<vscode.TextDocument> {
  // Get transformed code using our provider
  // The URI path identifies the source document, but will also be the name
  // of the transformed document. Hence, we add a suffix to let the user distinguish them
  const path = `${sourceDocument.fileName}${transformedDocumentSuffix}`;
  const uri = vscode.Uri.parse(`${myScheme}:${path}`, true);
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

  const sourceDoc = activeTextEditor.document;
  watchingDocuments.add(sourceDoc);

  let transformedDoc;
  try {
    transformedDoc = await getTransformedDoc(sourceDoc);
  } catch (e) {
    const message = e.message || `Unknown error: ${e.toString()}`;
    vscode.window.showErrorMessage(message);
    return;
  }

  vscode.window.showTextDocument(transformedDoc);
  vscode.window.showInformationMessage("Transformed code");
}
