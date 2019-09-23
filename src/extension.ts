//TODO look at other providers

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Disposable, DocumentSelector, languages, commands, FileStat } from "vscode";
import { BehaviorCodeLensProvider } from "./behaviorCodeLensProvider";
import { BehaviorCodeActionProvider } from "./behaviorCodeActionProvider";
import { BehaviorView as ContextView } from "./view/contextView";
import { BehaviorStatsProvider, DataBasesOptions } from './ngramsFetcher/behaviorStats';
import { TreeView as HierarchicalView, resources_t } from './view/hierarchicalView';
import { IndexerCollection } from "behavior-code-processing";
import { generate_stack, startDataBase, installTables, installFunctions } from "behavior-trace-processing";
import { writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { launchBrowser } from "chrome-instrumentation";

export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "vscode-behavior-analysis" is now active!');

	const config = vscode.workspace.getConfiguration('behaviorAnalysis');
	// const myUtil: MyUtil = new MyUtil(config, context);
	const disposables: Disposable[] = [];

	//TODO search for tmpfile were metrics are saved
	// context.subscriptions.push(...disposables);


	vscode.commands.registerCommand("BehaviorAnalysis.createDataBase",
		function (aaa?: null) {
			const id = config.get("database.identification");
			const stack_file: string | undefined = config.get("database.stackFile");
			if (!id || !stack_file) {
				throw new Error("no db config");
			}
			const stack = generate_stack(id as any);
			console.log("stack_file future content", stack);
			writeFileSync(stack_file, stack);
			console.log("stack_file pos", resolve(stack_file));
			startDataBase(stack_file);
			installTables(id as any);
			installFunctions(id as any);
		});

	vscode.commands.registerCommand("BehaviorAnalysis.launchInstrumentedBrowser",
		function (aaa?: null) {
			const big_output: string | undefined = config.get("experimentation.tracesOutputDirectory");
			if (!big_output) {
				throw new Error("no output for traces");
			}
			const sp:string|undefined = config.get("experimentation.startPage");
			if (!sp) {
				throw new Error("no startPage for traces");
			}
			if((vscode.Uri.parse(sp)).scheme!=='http'&&(vscode.Uri.parse(sp)).scheme!=='https'){
				throw new Error("need to use the http or https protocol");
			}
			launchBrowser(sp, join(big_output, "browser"));
		});

	// TODO return position changes
	// TODO add  a command to get the default plugin as a file to be modified

	if (!vscode.workspace.workspaceFolders) { throw new Error("no workspaces"); }

	// TODO test if database is reachable

	// const default_plugin = "behavior-code-processing/out/tests/example_behavior_plugin_made_by_user";
	const indexers = new Map(vscode.workspace.workspaceFolders.map(
		x => {
			const plugin: string | undefined = config.get('extendedBabelPlugin');
			if (!plugin) {
				throw new Error("no plugin given");
			}
			console.log(resolve(plugin));
			return [x.uri.toString(false), new IndexerCollection(require(join(x.uri.path,plugin)).default)];
		}));
	vscode.workspace.onDidChangeWorkspaceFolders(
		x => {
			const plugin: string | undefined = config.get('extendedBabelPlugin');
			if (!plugin) {
				throw new Error("no plugin given");
			}
			x.added.forEach(x => indexers.set(x.uri.toString(false), new IndexerCollection(require(join(x.uri.path,plugin)).default)));
			x.removed.forEach(x => indexers.delete(x.uri.toString(false)));
		});
	// const CodeActionProvider = new BehaviorCodeActionProvider(context, behaviorStatsProvider);
	// vscode.languages.registerCodeActionsProvider(
	// 	['javascript','javascriptreact','typescript','typescriptreact'], 
	// 	CodeActionProvider,indexers);

	const identification: DataBasesOptions["options"]|undefined = config.get('database.identification');
	if (!identification) {
		throw new Error("Can't get extendedBabelPlugin config");
	}
	const dbConfig: DataBasesOptions = {
		type: 'postgres',
		options: identification
	};

	const behaviorStatsProvider = new BehaviorStatsProvider(dbConfig);
	const CodeLensProvider = new BehaviorCodeLensProvider(context, behaviorStatsProvider, indexers);
	vscode.languages.registerCodeLensProvider(
		['javascript', 'javascriptreact', 'typescript', 'typescriptreact'],
		CodeLensProvider);
	const hierarchicalView = new HierarchicalView(context, behaviorStatsProvider);
	const contextView = new ContextView(context, behaviorStatsProvider);
}

// this method is called when your extension is deactivated
export function deactivate() { }
