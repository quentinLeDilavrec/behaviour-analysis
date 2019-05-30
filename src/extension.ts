import { inspect } from "util";

// https://github.com/kisstkondoros/codemetrics/blob/master/src/models/CodeMetricsCodeLens.ts
import { CodeLens, Range, Uri } from "vscode";

class MyCodeLens extends CodeLens {
	constructor(private model: string, private uri: Uri, range: Range) {
		super(range);
	}

	public getCollectedComplexity(): number {
		return 0;//this.model.getCollectedComplexity();
	}

	public toString(appConfig: string): string {
		return '';//this.model.toString(appConfig.getMySettings(this.uri));
	}

	public getExplanation(appConfig: string): string {
		return 'returned from MyCodeLens.getExplanation';//this.model.getExplanation();
	}

	public getChildren() {
		return [];//this.model.children;
	}
}


//https://github.com/kisstkondoros/codemetrics/blob/28e6bcf219c139969701f2b98c66108296f6e8c9/src/codelensprovider/CodeMetricsCodeLensProvider.ts#L13
import { CodeLensProvider, TextDocument, /*CodeLens, */CancellationToken, workspace } from "vscode";

export class MyCodeLensProvider implements CodeLensProvider {
	private myUtil: any;

	constructor(myUtil: any) {
		this.myUtil = myUtil;
	}

	provideCodeLenses(document: TextDocument, token: CancellationToken): vscode.ProviderResult<CodeLens[]> {
		// if (!this.myUtil.appConfig.myDisplayed) { return; }
		// if (!this.myUtil.appConfig.getMySettings(document.uri).CodeLensEnabled) { return; }
		return this.myUtil.getHints(document).then((hints: any) => {
			const result: CodeLens[] = hints.map(
				(model: any) => new MyCodeLens(model, document.uri, this.myUtil.toRange(model, document))
			);
			return result;
		});
	}

	resolveCodeLens(codeLens: CodeLens, token: CancellationToken): CodeLens {
		console.log(777, codeLens);
		if (codeLens instanceof MyCodeLens) {
			codeLens.command = {
				title: this.myUtil.format(codeLens),
				command: "my.showMyCodeLensInfo",
				arguments: [codeLens]
			};
			return codeLens;
		}
		return null as unknown as CodeLens;
	}
}


//https://github.com/kisstkondoros/codemetrics/blob/master/src/metrics/MetricsUtil.ts

class MyUtil {
	constructor(config: any, context: vscode.ExtensionContext) {

	}
	get selector(): DocumentSelector {
		return ['javascript'];
	}
	getHints(document: TextDocument) {
		return new Promise((resolve, reject) => resolve([1]));
	}
	format(codeLens: CodeLens) {
		return 'returned from MyUtil.format';
	}
	toRange(model: any, document: TextDocument) {
		return new Range(new vscode.Position(0, 0), new vscode.Position(0, 10));
	}
}


//https://github.com/hoovercj/vscode-extension-tutorial/blob/master/src/features/hlintProvider.ts
import * as vscode from 'vscode';

export default class MyLintingProvider implements vscode.CodeActionProvider {

	private static commandId: string = 'haskell.runCodeAction';
	private command!: vscode.Disposable;
	private diagnosticCollection!: vscode.DiagnosticCollection;

	public activate(subscriptions: vscode.Disposable[]) {
		this.command = vscode.commands.registerCommand(MyLintingProvider.commandId, this.runCodeAction, this);
		subscriptions.push(this);
		this.diagnosticCollection = vscode.languages.createDiagnosticCollection();

		vscode.workspace.onDidOpenTextDocument(this.doMylint, this, subscriptions);
		vscode.workspace.onDidCloseTextDocument((textDocument) => {
			this.diagnosticCollection.delete(textDocument.uri);
		}, null, subscriptions);

		vscode.workspace.onDidSaveTextDocument(this.doMylint, this);

		vscode.workspace.textDocuments.forEach(this.doMylint, this);
	}

	public dispose(): void {
		this.diagnosticCollection.clear();
		this.diagnosticCollection.dispose();
		this.command.dispose();
	}

	private doMylint(textDocument: vscode.TextDocument) {
		if (textDocument.languageId !== 'javascript') {
			return;
		}

		function PlaceHolder(input: vscode.TextDocument) { // TODO: parse and generate reports
			const item = {
				severity: 'error',
				hint: '${hint}',
				from: '${from}',
				to: '${to}',
				range: new vscode.Range(0, 0, 0, 10),
			};
			return [item];
		}

		let diagnostics: vscode.Diagnostic[] = PlaceHolder(textDocument)
			.map(item => {
				vscode.window.showInformationMessage('Coucou');
				const severity = item.severity.toLowerCase() === "warning" ?
					vscode.DiagnosticSeverity.Warning :
					vscode.DiagnosticSeverity.Error;
				const message = item.hint + " Replace: " + item.from + " ==> " + item.to;
				const range = item.range;
				const diagnostic = new vscode.Diagnostic(range, message, severity);
				diagnostic.source = MyLintingProvider.name;
				return diagnostic;
			});

		this.diagnosticCollection.set(textDocument.uri, diagnostics);
	}
	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.Command[] {
		return context.diagnostics.filter(diagnostic => diagnostic.source === MyLintingProvider.name).map(
			diagnostic =>
				({
					title: "Accept mylint suggestion" + inspect(diagnostic),
					command: MyLintingProvider.commandId,
					arguments: [document, diagnostic.range, diagnostic.message]
				}));
	}

	private runCodeAction(document: vscode.TextDocument, range: vscode.Range, message: string): any {
		// let fromRegex:RegExp = /.*Replace:(.*)==>.*/g
		// let fromMatch:RegExpExecArray = fromRegex.exec(message.replace(/\s/g, ''));
		let from = '';//fromMatch[1];
		let to: string = '';//document.getText(range).replace(/\s/g, '')
		if (from === to) {
			console.log(4, document, range, message);
			let newText = 'coucou ' + message;///.*==>\s(.*)/g.exec(message)[1]
			let edit = new vscode.WorkspaceEdit();
			edit.replace(document.uri, range, newText);
			return vscode.workspace.applyEdit(edit);
		} else {
			vscode.window.showErrorMessage("The suggestion was not applied because it is out of date. You might have tried to apply the same edit twice.");
		}
	}
}

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// import * as vscode from 'vscode';
import { Disposable, DocumentSelector, languages, commands } from "vscode";
import { platform } from "os";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-behaviour-analysis" is now active!');

	const config: Object = {};
	const myUtil: MyUtil = new MyUtil(config, context);
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
	disposables.push(
		vscode.commands.registerCommand('my.showMyCodeLensInfo', (codeLens) => {
			vscode.window.showInformationMessage('my.showMyCodeLensInfo' + inspect(codeLens), 'apply', 'abort')
			.then(x=>{
				if (x==='apply') {
					vscode.window.showInformationMessage('apply modification: ${modification} ');
				} else if (x==='cancel') {
					vscode.window.showInformationMessage('abort modification: ${modification}');
				}
			});
		})
	);
	
	disposables.push(
		languages.registerCodeLensProvider(myUtil.selector, new MyCodeLensProvider(myUtil))
	);

	context.subscriptions.push(...disposables);

	const linter = new MyLintingProvider();
	linter.activate(context.subscriptions);
	vscode.languages.registerCodeActionsProvider(myUtil.selector, linter);
}

// this method is called when your extension is deactivated
export function deactivate() { }
