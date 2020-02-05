import * as vscode from "vscode";
import { transform } from "./transform";

const myScheme = "hide-typescript";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.hideTypeScript", hideCommand)
  );

  const TransformedCodeProvider = class
    implements vscode.TextDocumentContentProvider {
    async provideTextDocumentContent(): Promise<string> {
      // Get the source code from the active editor
      const { activeTextEditor } = vscode.window;
      if (!activeTextEditor) {
        throw new Error("Lost the active editor");
      }
      const input = activeTextEditor.document.getText();

      // Transform the code to regular JS
      const output = await transform(input);
      if (!output) {
        throw new Error("Unable to transform code");
      }
      return output;
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

async function hideCommand() {
  const { activeTextEditor } = vscode.window;
  if (!activeTextEditor) {
    vscode.window.showErrorMessage("Couldn't find an active editor");
    return;
  }
  const activeEditorTitle = activeTextEditor.document.fileName;

  // Get transformed code using our provider
  const path = `${activeEditorTitle} (transformed)`; // new editor title will equal this
  const uri = vscode.Uri.parse(`${myScheme}:${path}`, true);
  let plainDocument;
  try {
    plainDocument = await vscode.workspace.openTextDocument(uri);
  } catch (e) {
    const message = e.message || `Unknown error: ${e.toString()}`;
    vscode.window.showErrorMessage(message);
    return;
  }

  // Set language to JS
  const jsDocument = await vscode.languages.setTextDocumentLanguage(
    plainDocument,
    "javascript"
  );

  vscode.window.showTextDocument(jsDocument);
  vscode.window.showInformationMessage("Transformed code");
}
