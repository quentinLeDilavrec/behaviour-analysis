// export class MyCodeLensProvider implements CodeLensProvider {
// 	private diagnosticCollection = vscode.languages.createDiagnosticCollection();

// 	constructor() {
// 	}

// 	provideCodeLenses(document: TextDocument, token: CancellationToken): vscode.ProviderResult<CodeLens[]> {
// 		// if (!this.myUtil.appConfig.myDisplayed) { return; }
// 		// if (!this.myUtil.appConfig.getMySettings(document.uri).CodeLensEnabled) { return; }
// 		return this.diagnosticCollection.then((hints: any[]) => {
// 			return hints.map(
// 				(model: any) => new MyCodeLens(model, document.uri, this.myUtil.toRange(model, document))
// 			);
// 		});
// 	}

// 	resolveCodeLens(codeLens: CodeLens, token: CancellationToken): CodeLens {
// 		console.log(777, codeLens);
// 		if (codeLens instanceof MyCodeLens) {
// 			codeLens.command = {
// 				title: this.myUtil.format(codeLens),
// 				command: "my.showMyCodeLensInfo",
// 				arguments: [codeLens]
// 			};
// 			return codeLens;
// 		}
// 		return null as unknown as CodeLens;
// 	}
// }


// //https://github.com/kisstkondoros/codemetrics/blob/master/src/metrics/MetricsUtil.ts

// class MyUtil {
// 	constructor(config: any, context: vscode.ExtensionContext) {

// 	}
// 	get selector(): DocumentSelector {
// 		return ['javascript'];
// 	}
// 	getHints(document: TextDocument) {
// 		return new Promise((resolve, reject) => resolve([1]));
// 	}
// 	format(codeLens: CodeLens) {
// 		return 'returned from MyUtil.format';
// 	}
// 	toRange(model: any, document: TextDocument) {
// 		return new Range(new vscode.Position(0, 0), new vscode.Position(0, 10));
// 	}
// }


// //https://github.com/hoovercj/vscode-extension-tutorial/blob/master/src/features/hlintProvider.ts
// import * as vscode from 'vscode';

// export default class MyLintingProvider implements vscode.CodeActionProvider {

// 	private static commandId: string = 'haskell.runCodeAction';
// 	private const command = vscode.commands.registerCommand(MyLintingProvider.commandId, this.runCodeAction, this);
// 	private diagnosticCollection = vscode.languages.createDiagnosticCollection();

// 	public activate(subscriptions: vscode.Disposable[]) {
// 		subscriptions.push(this);

// 		vscode.workspace.onDidOpenTextDocument(this.doMylint, this, subscriptions);
// 		vscode.workspace.onDidCloseTextDocument((textDocument) => {
// 			this.diagnosticCollection.delete(textDocument.uri);
// 		}, null, subscriptions);

// 		vscode.workspace.onDidSaveTextDocument(this.doMylint, this);

// 		vscode.workspace.textDocuments.forEach(this.doMylint, this);
// 	}

// 	public dispose(): void {
// 		this.diagnosticCollection.clear();
// 		this.diagnosticCollection.dispose();
// 		this.command.dispose();
// 	}

// 	private doMylint(textDocument: vscode.TextDocument) {
// 		if (textDocument.languageId !== 'javascript') {
// 			return;
// 		}

// 		function PlaceHolder(input: vscode.TextDocument) { // TODO: parse and generate reports
// 			const item = {
// 				severity: 'error',
// 				hint: '${hint}',
// 				from: '${from}',
// 				to: '${to}',
// 				range: new vscode.Range(0, 0, 0, 10),
// 			};
// 			return [item];
// 		}

// 		let diagnostics: vscode.Diagnostic[] = PlaceHolder(textDocument)
// 			.map(item => {
// 				vscode.window.showInformationMessage('Coucou');
// 				const severity = item.severity.toLowerCase() === "warning" ?
// 					vscode.DiagnosticSeverity.Warning :
// 					vscode.DiagnosticSeverity.Error;
// 				const message = item.hint + " Replace: " + item.from + " ==> " + item.to;
// 				const range = item.range;
// 				const diagnostic = new vscode.Diagnostic(range, message, severity);
// 				diagnostic.source = MyLintingProvider.name;
// 				return diagnostic;
// 			});

// 		this.diagnosticCollection.set(textDocument.uri, diagnostics);
// 	}
// 	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.Command[] {
// 		return context.diagnostics.filter(diagnostic => diagnostic.source === MyLintingProvider.name).map(
// 			diagnostic =>
// 				({
// 					title: "Accept mylint suggestion" + inspect(diagnostic),
// 					command: MyLintingProvider.commandId,
// 					arguments: [document, diagnostic.range, diagnostic.message]
// 				}));
// 	}

// 	private runCodeAction(document: vscode.TextDocument, range: vscode.Range, message: string): any {
// 		// let fromRegex:RegExp = /.*Replace:(.*)==>.*/g
// 		// let fromMatch:RegExpExecArray = fromRegex.exec(message.replace(/\s/g, ''));
// 		let from = '';//fromMatch[1];
// 		let to: string = '';//document.getText(range).replace(/\s/g, '')
// 		if (from === to) {
// 			console.log(4, document, range, message);
// 			let newText = 'coucou ' + message;///.*==>\s(.*)/g.exec(message)[1]
// 			let edit = new vscode.WorkspaceEdit();
// 			edit.replace(document.uri, range, newText);
// 			return vscode.workspace.applyEdit(edit);
// 		} else {
// 			vscode.window.showErrorMessage("The suggestion was not applied because it is out of date. You might have tried to apply the same edit twice.");
// 		}
// 	}
// }