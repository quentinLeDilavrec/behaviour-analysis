import * as vscode from 'vscode';
import { join } from "path";
import { parseLoc } from "behavior-code-processing";
import { BehaviorStatsProvider } from 'src/ngramsFetcher/behaviorStats';

export type ngram_t = { shift: number, ngram: string[], pocc: number, tocc: number };
export type symb_stats_t = { [x: string]: { pocc: number, tocc: number } };
export type resources_t = { symb_stats: symb_stats_t, ngrams: ngram_t[] };
export class BehaviorView {

  constructor(context: vscode.ExtensionContext, private stats: BehaviorStatsProvider) {
    // let callGraphProvider = new AntlrCallGraphProvider(backend, context);
    // context.subscriptions.push(commands.registerTextEditorCommand('antlr.call-graph', (editor: TextEditor, edit: TextEditorEdit) => {
    //     callGraphProvider.showWebview(editor, {
    //         title: "Call Graph: " + path.basename(editor.document.fileName)
    //     });
    // }));
    // vscode.window.createTextEditorDecorationType;
    let currentPanel: vscode.WebviewPanel | undefined = undefined;
    let currentResources: resources_t | undefined = undefined;
    function merge_resources(resources: resources_t, meta_shift = 0) {
      currentResources = currentResources || {} as resources_t;
      currentResources.symb_stats = currentResources.symb_stats || {} as symb_stats_t;
      currentResources.symb_stats = { ...currentResources.symb_stats, ...resources.symb_stats };

      currentResources.ngrams = currentResources.ngrams || [] as ngram_t[];
      function comp_string_arrays(arr1: string[], arr2: string[]) {
        if (arr1.length < arr2.length) { return false; }
        if (arr1.length > arr2.length) { return false; }
        let i = 0;
        while (i < arr1.length) {
          if (arr1[i] !== arr2[i]) {
            return false;
          }
          i++;
        }
        return true;
      }
      for (let i = 0; i < resources.ngrams.length; i++) {
        let j = 0;
        while (j < currentResources.ngrams.length) {
          // const element = currentResources.ngrams[j];
          if ((currentResources.ngrams[j] as any).shifts.findIndex(
            (x: any) =>
              currentResources ? x - (currentResources.ngrams[j] as any).meta === (resources.ngrams[i] as any).shifts[0] - meta_shift : false) > -1
            && comp_string_arrays(currentResources.ngrams[j].ngram, resources.ngrams[i].ngram)) {
            (currentResources.ngrams[j] as any).shifts.push((resources.ngrams[i] as any).shifts[0]);
            break;
          }
          j++;
        }
        if (j >= currentResources.ngrams.length) {
          currentResources.ngrams.push({ ...resources.ngrams[i], meta: meta_shift } as any);
        }
      }
    }

    function sendResources(resources: resources_t | undefined) {
      // if (resources) { merge_resources(resources); } //merge
      currentResources = resources; // replace
      if (!currentPanel) {
        return;
      }
      // Send a message to our webview.
      // You can send any JSON serializable data.
      if (currentResources) {
        console.log(currentResources);
        currentPanel.webview.postMessage(currentResources)
          .then(x => console.log('voyons...', x));
      }
    }

    context.subscriptions.push(
      vscode.commands.registerCommand('BehaviorProvider.showContextViewer', async (resources: resources_t | undefined | Promise<resources_t>) => {
        // TODO get root with https://github.com/Microsoft/vscode/wiki/Adopting-Multi-Root-Workspace-APIs#new-helpful-api
        const workspaces = vscode.workspace.workspaceFolders;
        if (!workspaces) {
          throw new Error('no workspaces');
        }
        const root = workspaces.length === 1 ? workspaces[0] : (await vscode.window.showWorkspaceFolderPick()) || workspaces[0];
        if (currentPanel) {
          currentPanel.reveal(vscode.ViewColumn.Two);
          if (resources !== undefined) {
            if ('then' in resources) {
              resources.then(x => sendResources(x));
            } else {
              sendResources(resources);
            }
          }
        } else {
          currentPanel = vscode.window.createWebviewPanel(
            'behaviorAnalysis',
            'Behavior Analysis',
            vscode.ViewColumn.Two,
            {
              enableScripts: true,
              retainContextWhenHidden: true,
              localResourceRoots: [vscode.Uri.file(join(context.extensionPath, 'Viewers/context-behavior-visualization'))]
            }
          );
          currentPanel.onDidDispose(
            () => {
              currentPanel = undefined;
            },
            undefined,
            context.subscriptions
          );

          // And set its HTML content
          const code_resources = {
            sankey: {
              script: vscode.Uri.file(join(context.extensionPath, 'Viewers', 'context-behavior-visualization', 'script.js')),
              style: vscode.Uri.file(join(context.extensionPath, 'Viewers', 'context-behavior-visualization', 'style.css')),
              data: vscode.Uri.file(join(context.extensionPath, 'Viewers', 'context-behavior-visualization', 'data.json')),
              d3: vscode.Uri.file(join(context.extensionPath, 'Viewers', 'context-behavior-visualization', 'd3/d3.js'))
            }
          };
          currentPanel.webview.html = getWebviewContent(code_resources.sankey);
        }
        function f(x: string) { // TODO remove it once shift is solved
          const [p, ...r] = x.split(/:/g);
          return [p, parseInt(r[0]) - 1, r[1], parseInt(r[2]) - 1, r[3]].join(':');
        }
        type inits_and_directions = { dir: 'next' | 'prev', init: string, meta: number };
        currentPanel.webview.onDidReceiveMessage(
          async message => {
            switch (message.command) {
              case 'req_ngrams':
                //TODO rm duplicated code and no merge of multiple inits
                const o = await Promise.all((message.inits_and_directions as inits_and_directions[]).map(async x => {
                  if (vscode.workspace.workspaceFolders === undefined) {
                    throw new Error('no workspace');
                  }
                  if (vscode.workspace.workspaceFolders.length !== 1) {
                    throw new Error("don't handle multi workspace");
                  }
                  const [p, ...r] = f(x.init).split(/:/g);
                  return await this.stats.searching(root.name, p, [parseInt(r[0]), parseInt(r[1]), parseInt(r[2]), parseInt(r[3])],true,true);//, vscode.workspace.workspaceFolders[0].uri, -1), true, true);
                }));
                const symbols = new Set<string>();
                o[0].forEach(x => x.ngram.forEach(x => symbols.add(f(x))));
                const symbols_stats = {} as symb_stats_t;
                (await this.stats.searchingSymbols(root.name, [...symbols]))
                  .forEach(x => {
                    if (x.ngram.length === 1) {
                      symbols_stats[x.ngram[0]] = {
                        pocc: x.pocc,
                        tocc: x.tocc
                      };
                    }
                  });
                sendResources({
                  symb_stats: symbols_stats,
                  ngrams: o[0]
                });
                return;
              case 'ready':
                if (resources !== undefined) {
                  const res = await resources;
                  sendResources(res);
                }
                return;
              case 'jump':
                if (vscode.workspace.workspaceFolders === undefined) {
                  throw new Error('no workspace');
                }
                if (vscode.workspace.workspaceFolders.length !== 1) {
                  throw new Error("don't handle multi workspace");
                }
                const loc = parseLoc(message.position);//, vscode.workspace.workspaceFolders[0].uri);//vscode.workspace[0]
                const doc = await vscode.workspace.openTextDocument(loc.uri);
                const edi = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
                edi.revealRange(loc.range, vscode.TextEditorRevealType.InCenter);
                return;
            }
          },
          this,
          context.subscriptions
        );
      })
    );
    // Our new command
    context.subscriptions.push(
      vscode.commands.registerCommand('BehaviorProvider.ngramAddToView', (resources: resources_t | undefined) => {
        sendResources(resources);
      })
    );
  }
}



function getWebviewContent(resources: {
  script: vscode.Uri;
  style: vscode.Uri;
  data: vscode.Uri;
  d3: vscode.Uri;
}) {
  // main_script_src.with({ scheme: 'vscode-resource' });
  // console.log(main_script_src.scheme);
  // data_src.with({ scheme: 'vscode-resource' });
  // console.log(data_src);
  return `
<!DOCTYPE html>
<meta charset="utf-8">
<link rel="stylesheet" href="${'vscode-resource://' + resources.style.path}" type="text/css"/>
<body>
<script src="${'vscode-resource://' + resources.d3.path}" type="text/javascript" ></script>
<script>window.mypath='${'vscode-resource://' + resources.data.path}'</script>
<div id="settings"></div>
<div id="chart"></div>
<script src="${'vscode-resource://' + resources.script.path}" type="text/javascript"></script>
</body>`;
  // <button type="button" onclick="collapseAll()">Collapse All</button>
  // <button type="button" onclick="expandAll()">Expand All</button>
}