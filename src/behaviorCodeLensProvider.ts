import { BehaviorCodeLens } from "./behaviorCodeLens";

import { inspect } from "util";
import { mkdirSync, existsSync } from "fs";
import { join, relative } from "path";

import * as vscode from 'vscode';

//https://github.com/kisstkondoros/codemetrics/blob/28e6bcf219c139969701f2b98c66108296f6e8c9/src/codelensprovider/CodeMetricsCodeLensProvider.ts#L13
import { CodeLensProvider, TextDocument, Range, CodeLens, CancellationToken, CodeActionProvider, workspace, Command, Location } from "vscode";

// https://github.com/kisstkondoros/codemetrics/blob/master/src/models/CodeMetricsCodeLens.ts
import { Uri } from "vscode";
import { throwStatement } from "@babel/types";
import { fstat } from "fs";
import { BehaviorStatsProvider } from "./ngramsFetcher/behaviorStats";
import { IndexerCollection } from "behavior-code-processing";

function splitUri(uri: Uri, root: Uri): Uri {
    if (uri.scheme !== root.scheme) {
        throw new Error("can't split a child uri by a root uri with different scheme");
    }
    return Uri.file(relative(root.path, uri.path));
}

export class BehaviorCodeLensProvider implements CodeLensProvider {
    private static commandCodeLensId: string = 'BehaviorCodeLensProvider.runCodeLens';
    private commandCodeLens = vscode.commands.registerCommand(BehaviorCodeLensProvider.commandCodeLensId, this.runCodeLens, this);

    constructor(context: vscode.ExtensionContext, private stats: BehaviorStatsProvider, private indexers: Map<string, IndexerCollection>) {
        context.subscriptions.push(this);
        if (!context.storagePath) { throw new Error("no storagePath"); }
    }

    public dispose(): void {
        this.commandCodeLens.dispose();
    }

    onDidChangeCodeLenses?: vscode.Event<void> | undefined;

    provideCodeLenses(document: TextDocument, token: CancellationToken): vscode.ProviderResult<CodeLens[]> {
        // const indexer = Parser.get(document.uri); // TODO remove old indexer when new is working
        const w = workspace.getWorkspaceFolder(document.uri);
        if (w === undefined) { throw new Error('no workspace found'); }
        const a = this.indexers.get(w.uri.toString(false));
        if (a === undefined) { throw new Error('indexer collection not found'); }
        const indexer = a.get(document.uri);
        indexer.setDocument(document);
        return indexer.getRanges().then(ranges => {
            console.log(258,w.uri.path,document.uri.path,relative(w.uri.path, document.uri.path));
            return ranges.map(range => new BehaviorCodeLens(this.stats, w, new vscode.Location(document.uri, range)));
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