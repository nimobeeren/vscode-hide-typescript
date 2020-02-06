import * as vscode from "vscode";
import { basename } from "path";
import { transform } from "./transform";

const uriScheme = "hide-typescript";
const transformedSuffix = " (transformed)";

// Maps a source document to an array of editors that contain the transformed document
const watchingEditors = new Map<vscode.TextDocument, vscode.TextEditor[]>();

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.hideTypeScript", hideTypeScript)
  );

  vscode.workspace.onDidChangeTextDocument(async event => {
    if (watchingEditors.has(event.document)) {
      // One of the documents we're watching has changed, so let's see if we can
      // update the transformed documents

      /// Check if there is any editor containing the transformed document
      const transformedDocumentName =
        event.document.fileName + transformedSuffix;
      const anyEditor = !!findEditorByDocumentName(transformedDocumentName);

      if (!anyEditor) {
        // Transformed document is not open anymore, so stop watching this document
        watchingEditors.delete(event.document);
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
      const newTransformedText = newTransformedDocument.getText();

      const editorsToUpdate = watchingEditors.get(event.document) || [];
      editorsToUpdate.forEach(editor => {
        editor.edit(editBuilder => {
          // Replace whole document text with new text
          const { lineCount } = editor.document;
          const startPos = editor.document.lineAt(0).range.start;
          const endPos = editor.document.lineAt(lineCount).range.end;
          const wholeDocument = new vscode.Range(startPos, endPos);
          editBuilder.replace(wholeDocument, newTransformedText);
        });
      });
    }
  });

  const TransformedCodeProvider = class
    implements vscode.TextDocumentContentProvider {
    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
      // Naively escape suffix string for use in regex
      // This will break when suffix contains symbols reserved by regex other than ) and (
      const escapedSuffix = transformedSuffix
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
    const filePath = editor.document.fileName;
    return name === basename(filePath);
  });
}

async function getTransformedDocument(
  sourceDocument: vscode.TextDocument
): Promise<vscode.TextDocument> {
  // Get transformed code using our provider
  // The URI path will be used by VS Code as the name of the transformed document
  const filePath = sourceDocument.fileName;
  const fileName = basename(filePath);
  const uriPath = `${fileName}${transformedSuffix}`;
  const uri = vscode.Uri.parse(`${uriScheme}:${uriPath}`, true);
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

  let transformedDocument;
  try {
    transformedDocument = await getTransformedDocument(sourceDocument);
  } catch (e) {
    const message = e.message || `Unknown error: ${e.toString()}`;
    vscode.window.showErrorMessage(message);
    return;
  }

  // Open the transformed document in a new editor
  const newEditor = await vscode.window.showTextDocument(transformedDocument);
  vscode.window.showInformationMessage("Transformed code");

  // Add the new editor the the list of watching editors
  const existingEditors = watchingEditors.get(sourceDocument) ?? [];
  watchingEditors.set(sourceDocument, [...existingEditors, newEditor]);
}
