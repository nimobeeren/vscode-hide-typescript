import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "extension.hideTypeScript",
    () => {
      vscode.window.showInformationMessage("Not implemented");
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
