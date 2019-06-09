import { Uri, Range, TextDocument, Position, workspace, Location } from "vscode";
import { parse } from "@babel/parser";
import { Program, File } from "@babel/types";
import * as btypes from "@babel/types";
import traverse from "@babel/traverse";
import { Visitor, NodePath } from "@babel/traverse";
import { inspect } from "util";
import { Stats, existsSync, readFileSync, mkdir, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { createConnection } from "mysql";
import * as vscode from "vscode";

export type BabelPath = string;
export function toBabelPath(loc: Location): BabelPath {
    return (loc.uri.toString(false)
        + ':' + (loc.range.start.line - 1)
        + ':' + (loc.range.start.character)
        + ':' + (loc.range.end.line - 1)
        + ':' + (loc.range.end.character));
}
export function fromBabelPath(str: BabelPath): Location {
    const tmp = str.split(':');
    return new Location(Uri.parse(tmp[0]),
        new Range(
            new Position(parseInt(tmp[1]) + 1, parseInt(tmp[2])),
            new Position(parseInt(tmp[3]) + 1, parseInt(tmp[4]))
        ));
}
export type NodePath<T> = NodePath<T>;
export type FctId_t = Location;/*{
    path: string,
    sl: number;
    sc: number;
    el: number;
    ec: number;
};*/
export class Parser {
    static mapping(location: Location): Location {
        const fileMap = this.changesMap.get(location.uri.toString(false));
        if (!fileMap) { return location; }
        const fctPath = fileMap.get(toBabelPath(location));
        if (!fctPath) { return location; }
        return fromBabelPath(fctPath);
    }
    private static changesMap: Map<string, Map<BabelPath, BabelPath>> = (() => {
        if (!workspace.workspaceFolders) { throw new Error("no workspaceFolders"); }

        function size2(x: string[]): [string, string] {
            if (x.length !== 2) { throw new Error(""); }
            return [x[0], x[1]];
        }

        return new Map(workspace.workspaceFolders
            .map(x => {
                if (!existsSync(x.uri.toString(false))) {
                    return [x.uri.toString(false), new Map()];
                }
                const data = readFileSync(
                    join(
                        x.uri.toString(false),
                        './vscode', 'behavior-analysis',
                        'modifications.csv')
                ).toString();
                return [
                    x.uri.toString(false) as string,
                    new Map<string, string>(data.split('\n').map(x => size2(x.split(' '))))];
            }));
    })();
    public static saveChangesMap() {
        if (!workspace.workspaceFolders) { throw new Error("no workspaceFolders"); }

        [...Parser.changesMap.entries()]
            .forEach(([name, map]) => {
                if (map.size <= 0) { return; }
                if (!existsSync(name)) {
                    mkdirSync(name);
                }
                writeFileSync(name, [...map.entries()].map(x => x[0] + ' ' + x[1]).join('\n'));
            });
    }

    private static Instanciated: Map<string, Parser> = new Map();
    public static get(uri: Uri) {
        return (Parser.Instanciated.get(uri.toString(false))
            || (parser => {
                Parser.Instanciated.set(uri.toString(false), parser);
                return parser;
            })(new Parser(uri)));
    }
    constructor(private uri: Uri) { }
    private document?: TextDocument;
    private ast?: File;
    private programPath?: NodePath<Program>;
    private index?: Map<BabelPath, NodePath<btypes.Function>>;
    // TODO look at memoize with invalidation mechanism, it would be perfect
    setDocument(document: TextDocument) {
        this.document = document;
    }
    async getDocument() {
        if (!this.document) { throw new Error("no document for this Parser instance"); }
        return this.document;
    }
    async document2ast(document: TextDocument) {
        let acc = this.index || new Map();
        return new Promise<File>((resolve, reject) => {
            try {
                resolve(parse(document.getText(), { sourceFilename: document.fileName, sourceType: 'module', plugins: ['typescript','jsx'] }));
            } catch (e) {
                console.error(e); // TODO look at reject for parsing error when modifications are done on the code
            }
            return acc;
        });
    }
    async buildAst() {
        return this.ast = await this.document2ast(this.document || await this.getDocument());
    }
    async getAst() {
        return this.ast || await this.buildAst();
    }
    async ast2index(ast: File): Promise<Map<BabelPath, NodePath<btypes.Function>>> {
        let acc = this.index || new Map();
        await traverse(ast, this.indexing(acc));
        return acc;
    }
    async buildIndex() {
        return this.index = await this.ast2index(this.ast || await this.getAst());
    }
    async getProgramPath(): Promise<NodePath<Program>> {
        if (!this.programPath) { await this.buildIndex(); }
        if (!this.programPath) { throw new Error("no programPath"); }
        return this.programPath;
    }
    async getIndex(): Promise<Map<BabelPath, NodePath<btypes.Function>>> {
        return this.index || await this.buildIndex();
    }
    private first = true;
    private async getInitial(): Promise<Range[]> { // TODO finish it
        return [...(this.index || await this.getIndex()).values()].map(x => Parser.nodePath2Range(x));
    }
    async getRanges(): Promise<Range[]> {
        if (this.first) {
            this.first = false;
            return await this.getInitial();
        }
        return [...(this.index || await this.getIndex()).values()].map(x => Parser.nodePath2Range(x));
    }
    // async getPathInAst(range:Range): BabelPath {
    //     return (this.index || await this.getIndex()).keys();
    // }
    getAllStats() { }
    // getStats() {
    //     // if (this.ast) { init() }
    //     // if (this.position) { return this.position; }
    //     if (!this.ast) { throw new Error("no ast"); }
    //     if (!this.index) { throw new Error("no index"); }
    //     if (this.stats) { return this.stats; }
    //     // let a = this.instanceOfSomething.next().value;
    //     // if (!a) { return; }
    //     // if (typeof a === 'string') { return; }
    //     // if (typeof a === 'function') { return; }
    //     // return a;
    //     this.stats = (this.index.then(x => {
    //         let a = x.map(async x => {
    //             if (!this.document) { throw new Error("no document"); }
    //             return this.searching(this.document.fileName, x);
    //         });
    //         // let b = await Promise.all(a);
    //         return a;
    //     }));
    //     return this.stats;
    // }
    private indexing(acc: Map<BabelPath, NodePath<btypes.Function>>)/*: Visitor<btypes.Function>*/ {
        const uri = this.uri;
        const _this = this;
        return {
            Program(path: NodePath<btypes.Program>) {
                _this.programPath = path;
            },
            Function(path: NodePath<btypes.Function>) {
                acc.set(toBabelPath(Parser.nodePath2Location(uri, path)), path);
            },
            // FunctionExpression(path) {
            //     acc.set(toBabelPath(Parser.nodePath2Location(uri,path)), path);
            // },
            // ArrowFunctionExpression(path) {
            //     acc.set(toBabelPath(Parser.nodePath2Location(uri,path)), path);
            // },
            // ClassDeclaration(path) {
            //     acc.set(toBabelPath(Parser.nodePath2Location(uri,path)), path);
            // }
        };
    }
    // private async searching(URL: string, path: NodePath<btypes.Function>) {
    //     function genInitReq(cols: string[]) {
    //         return [`SELECT path, params, COUNT(*), SIGN(session) FROM CALLS
    //       WHERE ` + cols.map(x => x + ' = ?').join(' AND '), 'init', (x: string) => x + `.fct0, ` + x + `.params0, `];
    //     }
    //     function makeReq<T>(init_dict: Map<string, T>) {
    //         const { k, v } = [...init_dict.entries()].reduce<{ k: string[], v: T[] }>(({ k, v }, [kx, vx]) => ({ k: [...k, kx], v: [...v, vx] }), { k: [], v: [] });
    //         const req = genInitReq(k)[0] + `
    //         GROUP BY path, params, SIGN(session)
    //         `;
    //         const connection = createConnection({
    //             host: 'localhost',
    //             port: 9992,
    //             user: 'ubehaviour',
    //             password: 'password',
    //             database: 'behaviour'
    //         });

    //         connection.connect();
    //         console.log(req);
    //         return (new Promise((resolve, reject) =>
    //             connection.query(req, v, function (err, data) {
    //                 if (err) { reject(err); }
    //                 else { resolve(data); }
    //             }))).finally(() =>
    //                 connection.end());
    //     }
    //     const fctObj: { [nodeType: string]: (path: any) => Promise<any> } = {
    //         async FunctionDeclaration(path: NodePath<btypes.FunctionDeclaration>) {
    //             if (!path.node.loc) { throw new Error("no location in " + inspect(path)); }
    //             const map = new Map();
    //             map.set('root', 'gutenberg');
    //             console.log(URL);
    //             map.set('path', 'packages/edit-post/src/store/selectors.js');
    //             map.set('sl', 111);//path.node.loc.start.line);
    //             map.set('sc', 7);//path.node.loc.start.column);
    //             map.set('el', 113);//path.node.loc.end.line);
    //             map.set('ec', 1);//path.node.loc.end.column);
    //             return await makeReq(map);
    //         },
    //         async FunctionExpression(path: NodePath<btypes.FunctionExpression>) {
    //             if (!path.node.loc) { throw new Error("no location in " + inspect(path)); }
    //             const map = new Map();
    //             map.set('root', 'gutenberg');
    //             map.set('path', URL);
    //             map.set('sl', path.node.loc.start.line);
    //             map.set('sc', path.node.loc.start.column);
    //             map.set('el', path.node.loc.end.line);
    //             map.set('ec', path.node.loc.end.column);
    //             return await makeReq(map);
    //         },
    //         async ArrowFunctionExpression(path: NodePath<btypes.ArrowFunctionExpression>) {
    //             if (!path.node.loc) { throw new Error("no location in " + inspect(path)); }
    //             const map = new Map();
    //             map.set('root', 'gutenberg');
    //             map.set('path', URL);
    //             map.set('sl', path.node.loc.start.line);
    //             map.set('sc', path.node.loc.start.column);
    //             map.set('el', path.node.loc.end.line);
    //             map.set('ec', path.node.loc.end.column);
    //             return await makeReq(map);
    //         }
    //     };
    //     const pos = Parser.nodePath2Range(path);
    //     const res = await fctObj[path.type](path);
    //     return {
    //         range: pos,
    //         stats: res
    //     };
    // }
    async getLocation(path: string) {
        if (!this.ast) { throw new Error("no ast"); }
        if (!this.programPath) { throw new Error("no programPath"); }
        const _path: NodePath<any> = (p => {
            if (p instanceof Array) { throw new Error(""); }
            if (btypes.isFunctionDeclaration(p.node)) { return p; }
            if (btypes.isFunctionExpression(p.node)) { return p; }
            if (btypes.isArrayExpression(p.node)) { return p; }
            throw new Error("");
        })((await this.getProgramPath()).get(path));
        if (!this.document) { throw new Error("no document"); }
        const uri = this.uri;
        const fctObj: { [nodeType: string]: (path: any) => Location } = {
            Function(path: NodePath<btypes.Function>) {
                if (!path.node.loc) { throw new Error("no location in " + inspect(path)); }
                return Parser.nodePath2Location(uri, path);
            },
            // FunctionDeclaration(path: NodePath<btypes.FunctionDeclaration>) {
            //     if (!path.node.loc) { throw new Error("no location in " + inspect(path)); }
            //     return Parser.nodePath2Location(uri,path);
            // },
            // FunctionExpression(path: NodePath<btypes.FunctionExpression>) {
            //     if (!path.node.loc) { throw new Error("no location in " + inspect(path)); }
            //     return Parser.nodePath2Location(uri,path);
            // },
            // ArrowFunctionExpression(path: NodePath<btypes.ArrowFunctionExpression>) {
            //     if (!path.node.loc) { throw new Error("no location in " + inspect(path)); }
            //     return Parser.nodePath2Location(uri,path);
            // }
        };
        if (!_path.type) { throw new Error("node dont have type field"); }
        return fctObj[_path.type](path);
    }

    static nodePath2Range(path: NodePath): Range {
        if (!path.node.loc) { throw new Error("no location in " + inspect(path)); }
        return new Range(
            new Position(path.node.loc.start.line - 1, path.node.loc.start.column),
            new Position(path.node.loc.end.line - 1, path.node.loc.end.column));
    }
    static nodePath2Location(uri: Uri, path: NodePath): Location {
        return new Location(uri, Parser.nodePath2Range(path));
    }
    static locationToArray(loc: Location): [string, number, number, number, number] {
        const ori = vscode.workspace.getWorkspaceFolder(loc.uri);
        if(!ori) throw 'file not in working directory';
        console.log(loc.uri.path.slice(ori.uri.path.length+1));
        return [loc.uri.path.slice(ori.uri.path.length+1),
        loc.range.start.line + 1, loc.range.start.character,
        loc.range.end.line + 1, loc.range.end.character];
        // return ['packages/hooks/src/createRunHook.js',
        //     12, 0, 71, 1];
    }

}
