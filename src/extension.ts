import * as vscode from "vscode";
import { transform } from "./transform";

const myScheme = "hide-typescript";

function transformActiveEditor() {
  // Show the transformed code
  const uri = vscode.Uri.parse(`${myScheme}:active`, true); // the `active` part doesn't matter
  vscode.window.showTextDocument(uri);
  vscode.window.showInformationMessage("Transformed code"); // TODO: do something when it fails
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.hideTypeScript",
      transformActiveEditor
    )
  );

  const TransformedCodeProvider = class
    implements vscode.TextDocumentContentProvider {
    async provideTextDocumentContent(/* uri: vscode.Uri */): Promise<string> {
      // Get the source code from the active editor
      const { activeTextEditor } = vscode.window;
      if (!activeTextEditor) {
        // TODO: some way to abort without throwing
        throw new Error("Couldn't find an active editor");
      }
      const input = activeTextEditor.document.getText();

      // Transform the code to regular JS
      const output = await transform(input);
      if (!output) {
        // TODO: some way to abort without throwing
        throw new Error("Unable to transform code");
      }
      return output;
      // TODO: make it understand that the output is JS code
      // TODO: set document title to something sensible
    }
  };

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      myScheme,
      new TransformedCodeProvider()
    )
  );
}

export function deactivate() {}
