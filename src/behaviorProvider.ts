import { Parser } from "./astThings";
import { BehaviorCodeLens } from "./behaviorCodeLens";

import { inspect } from "util";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

import * as vscode from 'vscode';

//https://github.com/kisstkondoros/codemetrics/blob/28e6bcf219c139969701f2b98c66108296f6e8c9/src/codelensprovider/CodeMetricsCodeLensProvider.ts#L13
import { CodeLensProvider, TextDocument, Range, CodeLens, CancellationToken, CodeActionProvider, workspace, Command, Location } from "vscode";

// https://github.com/kisstkondoros/codemetrics/blob/master/src/models/CodeMetricsCodeLens.ts
import { Uri } from "vscode";
import { throwStatement } from "@babel/types";
import { fstat } from "fs";
import { searching } from "./BehaviorStats";

export class BehaviorProvider implements CodeLensProvider, CodeActionProvider {
    private static commandCodeLensId: string = 'BehaviorProvider.runCodeLens';
    private commandCodeLens = vscode.commands.registerCommand(BehaviorProvider.commandCodeLensId, this.runCodeLens, this);
    private static commandActionId: string = 'BehaviorProvider.runCodeAction';
    private commandAction = vscode.commands.registerCommand(BehaviorProvider.commandActionId, this.runCodeAction, this);
    private diagnosticCollection = vscode.languages.createDiagnosticCollection();
    constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(this);
        if (!context.storagePath) { throw new Error("no storagePath"); }

        vscode.workspace.onDidOpenTextDocument(this.dolint, this, context.subscriptions);
        vscode.workspace.onDidCloseTextDocument((textDocument) => {
            this.diagnosticCollection.delete(textDocument.uri);
        }, null, context.subscriptions);

        vscode.workspace.onDidSaveTextDocument(this.dolint, this);

        vscode.workspace.textDocuments.forEach(this.dolint, this);
    }

    public dispose(): void {
        this.diagnosticCollection.clear();
        this.diagnosticCollection.dispose();
        this.commandAction.dispose();
        this.commandCodeLens.dispose();
    }

    private async dolint(document: vscode.TextDocument) {
        //TODO test if called on other languages
        if (document.languageId !== 'javascript'
            && document.languageId !== 'javascriptreact'
            && document.languageId !== 'typescript'
            && document.languageId !== 'typescriptreact') {
            return;
        }

        const parser = Parser.get(document.uri);
        parser.setDocument(document);

        async function getCallStats(location:Location) {
            const o: any[] = await searching(location);
           // TODO bench it
            const tuple = o.reduce<[any[], any]>(([prod, test], x) =>
                x['SIGN(session)'] === -1 ? [prod, [...test, x]] : [[...prod, x], test], [[], []]);
            const index = o.findIndex(x=>x['SIGN(session)'] === -1);
            const prods = o.slice(0,index);
            const tests = o.slice(index);
            const stats_format = (x:any)=>x['COUNT(*)']+' x '+ x.params;
            const params_count = (x:any)=>inspect({parameter:x.params,usage:x['COUNT(*)']});
            return prods.map(stats_format)+'\nbut only the following cases were tested\n'+tests.map(stats_format);
        }
        let diagnostics = await (await parser.getRanges())
            .map(async range => {
                const item = {
                    severity: vscode.DiagnosticSeverity.Hint,
                    hint: await getCallStats( new Location(document.uri, range)),
                    range: range,
                };
                return await item;
            })
            .map(async item => {
                // vscode.window.showInformationMessage('Coucou');
                const severity = (await item).severity;
                const message = (await item).hint;
                const range = (await item).range;
                const diagnostic = new vscode.Diagnostic(range, message, severity);
                diagnostic.source = BehaviorProvider.name;
                return diagnostic;
            });

        this.diagnosticCollection.set(document.uri, await Promise.all(diagnostics));
    }

    provideCodeActions(document: TextDocument, range: Range | vscode.Selection, context: vscode.CodeActionContext, token: CancellationToken): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
        return context.diagnostics.filter(diagnostic => diagnostic.source === BehaviorProvider.name).map(
            diagnostic =>
                ({
                    title: 'testing code action',
                    command: BehaviorProvider.commandActionId,
                    arguments: [document, diagnostic.range, diagnostic.message]
                }));
    }

    private runCodeAction(document: vscode.TextDocument, range: vscode.Range, message: string): any {
        const { from, newText } = JSON.parse(message);
        // let fromRegex:RegExp = /.*Replace:(.*)==>.*/g
        // let fromMatch:RegExpExecArray = fromRegex.exec(message.replace(/\s/g, ''));
        let to: string = document.getText(range).replace(/\s/g, '');
        if (from.replace(/\s/g, '') === to) {
            let newText = 'coucou ' + message;
            let edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, range, newText);
            return vscode.workspace.applyEdit(edit);
        } else {
            vscode.window.showErrorMessage("The suggestion was not applied because it is out of date. You might have tried to apply the same edit twice.");
        }
    }

    onDidChangeCodeLenses?: vscode.Event<void> | undefined;

    static async PlaceHolder(input: vscode.TextDocument) { // TODO: parse and generate reports
        return await [new Range(0, 0, 0, 10)];
    }

    provideCodeLenses(document: TextDocument, token: CancellationToken): vscode.ProviderResult<CodeLens[]> {
        const parser = Parser.get(document.uri);
        parser.setDocument(document);
        return parser.getRanges().then(ranges => {
            return ranges.map(range => new BehaviorCodeLens(new vscode.Location(document.uri, range)));
        });
    }
    async runCodeLens(codeLens: BehaviorCodeLens) {

        vscode.window.showInformationMessage(await codeLens.getCallStats('test') + ' calls during test\n' + await codeLens.getCallStats('production') + ' calls during production,'
            + '\n do you want to add new tests?', 'Yes', 'No')
            .then(x => {
                if (x === 'Yes') {
                    vscode.window.showInformationMessage('add new tests for ' + '?' + ' in ' + '/aaa/test/bbbb.test.js');
                } else if (x === 'No') {
                    vscode.window.showInformationMessage('don\'t add new tests');
                }
            });
    }

    resolveCodeLens(codeLens: BehaviorCodeLens, token: CancellationToken): vscode.ProviderResult<CodeLens> {
        // let a = this.getStats();
        if (codeLens instanceof BehaviorCodeLens) {
            return (new Promise<Command>(async (resolve) =>
                resolve({
                    title: 'dyn. usage ' + await codeLens.getCallStats(),
                    command: BehaviorProvider.commandCodeLensId,
                    arguments: [codeLens]
                })).then(
                    x => {
                        codeLens.command = x;
                        return codeLens;
                    }));
        }
        return null;
    }
}


