//TODO look at other providers

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Disposable, DocumentSelector, languages, commands } from "vscode";
import { BehaviorProvider } from "./behaviorProvider";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-behaviour-analysis" is now active!');

	const config: Object = {};
	// const myUtil: MyUtil = new MyUtil(config, context);
	const disposables: Disposable[] = [];

	disposables.push(
		// The command has been defined in the package.json file
		// Now provide the implementation of the command with registerCommand
		// The commandId parameter must match the command field in package.json
		vscode.commands.registerCommand('extension.helloWorld', () => {
			// The code you place here will be executed every time your command is executed

			// Display a message box to the user
			vscode.window.showInformationMessage('Hello World!');
		})
	);
	// disposables.push(
	// 	vscode.commands.registerCommand('my.showMyCodeLensInfo', (codeLens) => {
	// 		vscode.window.showInformationMessage('my.showMyCodeLensInfo' + inspect(codeLens), 'apply', 'abort')
	// 			.then(x => {
	// 				if (x === 'apply') {
	// 					vscode.window.showInformationMessage('apply modification: ${modification} ');
	// 				} else if (x === 'cancel') {
	// 					vscode.window.showInformationMessage('abort modification: ${modification}');
	// 				}
	// 			});
	// 	})
	// );

	// disposables.push(
	// 	languages.registerCodeLensProvider(myUtil.selector, new MyCodeLensProvider(myUtil))
	// );

		//TODO search for tmpfile were metrics are saved

	// context.subscriptions.push(...disposables);

	// const linter = new MyLintingProvider();
	// linter.activate(context.subscriptions);
	// vscode.languages.registerCodeActionsProvider(myUtil.selector, linter);
	console.log('coucou');
	const Provider = new BehaviorProvider(context);
	vscode.languages.registerCodeActionsProvider(
		['javascript','javascriptreact','typescript','typescriptreact'], 
		Provider);
	vscode.languages.registerCodeLensProvider(
		['javascript','javascriptreact','typescript','typescriptreact'], 
		Provider);

	// TODO return position changes
}

// this method is called when your extension is deactivated
export function deactivate() { }
