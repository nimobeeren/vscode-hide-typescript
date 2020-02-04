import * as vscode from "vscode";
import { transform } from "./transform";

async function transformActiveEditor() {
  // Get the code from the active editor
  const { activeTextEditor } = vscode.window;
  if (!activeTextEditor) {
    vscode.window.showErrorMessage("Couldn't find an active editor");
    return;
  }
  const source = activeTextEditor.document.getText();

  // Transform the code to regular JS
  const transformedSource = await transform(source);
  if (!transformedSource) {
    vscode.window.showErrorMessage("Unable to transform code");
    return;
  }
  const transformedDocument = await vscode.workspace.openTextDocument({
    language: "javascript",
    content: transformedSource
  });

  // Show the transformed code
  vscode.window.showTextDocument(transformedDocument);
  vscode.window.showInformationMessage("Transformed code");
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "extension.hideTypeScript",
    transformActiveEditor
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
