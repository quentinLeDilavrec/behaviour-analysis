import { Parser } from "./utils/astThings";
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


export class BehaviorCodeLensProvider implements CodeLensProvider {
    private static commandCodeLensId: string = 'BehaviorCodeLensProvider.runCodeLens';
    private commandCodeLens = vscode.commands.registerCommand(BehaviorCodeLensProvider.commandCodeLensId, this.runCodeLens, this);
    constructor(context: vscode.ExtensionContext, private stats:BehaviorStatsProvider, ) {
        context.subscriptions.push(this);
        if (!context.storagePath) { throw new Error("no storagePath"); }
    }

    public dispose(): void {
        this.commandCodeLens.dispose();
    }

    onDidChangeCodeLenses?: vscode.Event<void> | undefined;

    provideCodeLenses(document: TextDocument, token: CancellationToken): vscode.ProviderResult<CodeLens[]> {
        const parser = Parser.get(document.uri);
        parser.setDocument(document);
        return parser.getRanges().then(ranges => {
            return ranges.map(range => new BehaviorCodeLens(this.stats, new vscode.Location(document.uri, range)));
        });
    }
    async runCodeLens(codeLens: BehaviorCodeLens) {
        vscode.commands.executeCommand('BehaviorProvider.showContextViewer', codeLens.getFastWebViewResources());
        // const stats = await codeLens.getWebViewResources();
        // vscode.commands.executeCommand('BehaviorProvider.ngramAddToView',stats);
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
                    command: BehaviorCodeLensProvider.commandCodeLensId,
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