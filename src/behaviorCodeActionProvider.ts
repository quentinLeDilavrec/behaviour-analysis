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
import { BehaviorStatsProvider } from "./ngramsFetcher/behaviorStats";
import { NgramStats } from "./utils/behaviorTypes";
import { IndexerCollection } from "behavior-code-processing";

export class BehaviorCodeActionProvider implements CodeActionProvider {
    private static commandActionId: string = 'BehaviorCodeActionProvider.runCodeAction';
    private commandAction = vscode.commands.registerCommand(BehaviorCodeActionProvider.commandActionId, this.runCodeAction, this);
    private diagnosticCollection = vscode.languages.createDiagnosticCollection();
    constructor(context: vscode.ExtensionContext, private stats:BehaviorStatsProvider, private indexers: Map<string, IndexerCollection>) {
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
    }

    private async dolint(document: vscode.TextDocument) {
        //TODO test if called on other languages
        if (document.languageId !== 'javascript'
            && document.languageId !== 'javascriptreact'
            && document.languageId !== 'typescript'
            && document.languageId !== 'typescriptreact') {
            return;
        }

        const w = workspace.getWorkspaceFolder(document.uri);
        if (w === undefined) { throw new Error('no workspace found'); }
        const a = this.indexers.get(w.uri.toString(false));
        if (a === undefined) { throw new Error('indexer collection not found');}
        const indexer = a.get(document.uri);
        indexer.setDocument(document);
        
        let diagnostics = await (await indexer.getRanges())
            .map(async range => {
                console.log(99,range);
                const item = {
                    severity: vscode.DiagnosticSeverity.Hint,
                    hint: 'computing hint...',
                    range: range,
                };
                return await item;
            })
            .map(async item => {
                // vscode.window.showInformationMessage('Coucou');
                const severity = (await item).severity;
                const message = (await item).hint.toString();
                const range = (await item).range;
                const diagnostic = new vscode.Diagnostic(range, message, severity);
                diagnostic.source = BehaviorCodeActionProvider.name;
                return diagnostic;
            });

        this.diagnosticCollection.set(document.uri, await Promise.all(diagnostics));
    }

    provideCodeActions(
        document: TextDocument, range: Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: CancellationToken
    ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
        return Promise.all(context.diagnostics.filter(diagnostic => diagnostic.source === BehaviorCodeActionProvider.name).map(
            async diagnostic => {
                const stats:NgramStats[] = [];//await this.stats.searching(new Location(document.uri, range));
                return {
                    title: 'testing code action',
                    command: BehaviorCodeActionProvider.commandActionId,
                    arguments: [document, diagnostic.range, 'got hint', stats]
                };
            }));
    }

    private runCodeAction(document: vscode.TextDocument, range: vscode.Range, message: string, stats:NgramStats[]): any {
        vscode.window.showErrorMessage('no code action available for now');
        // // let fromRegex:RegExp = /.*Replace:(.*)==>.*/g
        // // let fromMatch:RegExpExecArray = fromRegex.exec(message.replace(/\s/g, ''));
        // let to: string = document.getText(range).replace(/\s/g, '');
        // if (from.replace(/\s/g, '') === to) {
        //     let newText = 'coucou ' + message;
        //     let edit = new vscode.WorkspaceEdit();
        //     edit.replace(document.uri, range, newText);
        //     return vscode.workspace.applyEdit(edit);
        // } else {
        //     vscode.window.showErrorMessage("The suggestion was not applied because it is out of date. You might have tried to apply the same edit twice.");
        // }
    }
}