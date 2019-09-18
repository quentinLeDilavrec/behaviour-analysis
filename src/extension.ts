//TODO look at other providers

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Disposable, DocumentSelector, languages, commands, FileStat } from "vscode";
import { BehaviorCodeLensProvider } from "./behaviorCodeLensProvider";
import { BehaviorCodeActionProvider } from "./behaviorCodeActionProvider";
import { BehaviorView as ContextView } from "./view/contextView";
import { BehaviorStatsProvider } from './ngramsFetcher/behaviorStats';
import { TreeView as HierarchicalView, resources_t } from './view/hierarchicalView';

export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "vscode-behavior-analysis" is now active!');

	const config = vscode.workspace.getConfiguration('behaviorAnalysis');
	// const myUtil: MyUtil = new MyUtil(config, context);
	const disposables: Disposable[] = [];

	//TODO search for tmpfile were metrics are saved
	// context.subscriptions.push(...disposables);


	// TODO return position changes
	vscode.commands.registerCommand("BehaviorAnalysis.start", 
	function (aaa:null) {
		
	// vscode.WorkspaceEdit.
	});

	// const CodeActionProvider = new BehaviorCodeActionProvider(context, behaviorStatsProvider);
	// vscode.languages.registerCodeActionsProvider(
	// 	['javascript','javascriptreact','typescript','typescriptreact'], 
	// 	CodeActionProvider);
	const behaviorStatsProvider = new BehaviorStatsProvider('postgres');
	const CodeLensProvider = new BehaviorCodeLensProvider(context, behaviorStatsProvider);
	vscode.languages.registerCodeLensProvider(
		['javascript', 'javascriptreact', 'typescript', 'typescriptreact'],
		CodeLensProvider);
	const hierarchicalView = new HierarchicalView(context, behaviorStatsProvider);
	const contextView = new ContextView(context, behaviorStatsProvider);

}

// this method is called when your extension is deactivated
export function deactivate() { }
