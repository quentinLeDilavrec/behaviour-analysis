import { Client } from 'pg';
import { from as copyFrom } from "pg-copy-streams";
import * as fs from "fs";
import { PassThrough, Transform } from "stream";
import { merge } from "event-stream";
import { Location } from "vscode";
import { NgramStats } from '../utils/behaviorTypes';
import { SerializedLoc, serializeLoc } from 'behavior-code-processing';
import { BehaviorClient, BehaviorClientPostgres } from 'behavior-trace-processing';
import * as vscode from "vscode";
import { Range } from "vscode";
import { join, resolve } from 'path';
import { BehaviorClientDummy } from './dummy';
export type DummyOptions = { type: 'dummy', options?: { name: string } };
type DataBaseOptions = { user: string, host: string, database: string, password: string, port: number, };

export type DataBasesOptions = { type: 'mysql' | 'postgres', options: { [root: string]: DataBaseOptions } | DataBaseOptions };
function isDataBaseOptions(x: { [root: string]: DataBaseOptions } | DataBaseOptions): x is DataBaseOptions {
  return (typeof x['user'] === 'string'
    && typeof x['host'] === 'string'
    && typeof x['database'] === 'string'
    && typeof x['password'] === 'string'
    && typeof x['port'] === 'number');
}
export class BehaviorStatsProvider {
  private searchingCache = new Map<string, Map<SerializedLoc, NgramStats[]>>();
  private defaultBehaviorClient?: BehaviorClient;
  private behaviorClients = new Map<string, BehaviorClient>();
  constructor(handler: DataBasesOptions | DummyOptions) {
    if (handler.type === 'postgres') {
      if (isDataBaseOptions(handler.options)) {
        this.defaultBehaviorClient = new BehaviorClientPostgres(
          handler.options.user,
          handler.options.host,
          handler.options.database,
          handler.options.password,
          handler.options.port
        );
      } else {
        for (const key in handler.options) {
          if (handler.options.hasOwnProperty(key)) {
            const element = handler.options[key];
            const roots = key.split(/|/g);
            const c = new BehaviorClientPostgres(
              element.user,
              element.host,
              element.database,
              element.password,
              element.port,
            );
            for (const root of roots) {
              this.behaviorClients.set(root, c);
            }
          }
        }
      }
    } else if (handler.type === 'dummy') {
      this.defaultBehaviorClient = new BehaviorClientDummy(
        handler.options && handler.options.name || 'dummy');
      // } else if (handler.type === 'mysql') {
      //   this.behaviorClient = new BehaviorClientMysql(
      //     handler.options && handler.options.user || 'ubehavior',
      //     handler.options && handler.options.host || 'localhost',
      //     handler.options && handler.options.database || 'behaviordb',
      //     handler.options && handler.options.password || 'password',
      //     handler.options && handler.options.port || 5432,
      //   );
    } else {
      throw new Error(`${handler.type} is not a valid database type.`);
    }
  }

  invalidateFromDB() {
    this.searchingCache.clear();
  }

  static toLocalArray(range: Range): [number, number, number, number] {
    return [
      range.start.line,
      range.start.character,
      range.end.line,
      range.end.character,
    ];
  }
  private static shiftLines(range: [number, number, number, number]) {
    return [range[0], range[1], range[2], range[3]];
    // return [range[0] + 1, range[1], range[2] + 1, range[3]];
  }
  private static shiftLines2(loc: string[]) {
    return [loc[0], parseInt(loc[1]), parseInt(loc[2]), parseInt(loc[3]), parseInt(loc[4])];
    // return [loc[0], parseInt(loc[1]) + 1, parseInt(loc[2]), parseInt(loc[3]) + 1, parseInt(loc[4])];
  }

  async searching(root: string, relative: string, range: Range | [number, number, number, number], morePrev = false, moreNext = false) {
    const arr = range instanceof Range ? BehaviorStatsProvider.toLocalArray(range) : range;
    const path = [relative, ...arr].join(':');
    let r0 = this.searchingCache.get(root);
    if (!r0) {
      r0 = new Map();
      this.searchingCache.set(root, r0);
    }
    let r = r0.get(path);
    let n: number | undefined = undefined;
    if (r === undefined || r.length < 2) {
      n = 2;
    } else if (morePrev || moreNext) { // TODO use the next branch
      n = 3;
    } else if (r && r.length > 1 && (morePrev || moreNext)) { // TODO don't seem to work
      n = 3;
    } else if (false) { // use for update, maybe a timer/counter/flag/dirty_bit?
      r = undefined;
    }
    const a = this.behaviorClients.get(root) || this.defaultBehaviorClient;
    if (a === undefined) {
      throw new Error('No traces for this root, ' + root);
    }
    r = await a.makeReq(
      ['formatPath(path)', 'sl', 'sc', 'el', 'ec'],
      [relative, BehaviorStatsProvider.shiftLines(arr)],
      root, n);
    r0.set(path, r);
    return r;
  }

  async searchingSymbols(root: string, symbols: SerializedLoc[]): Promise<NgramStats[]>;
  async searchingSymbols(root: string, symbols?: number): Promise<{ path: string; sl: number; sc: number; pocc: number; tocc: number; }[]>;
  async searchingSymbols(root: string, symbols?: SerializedLoc[] | number) {
    let _r0 = this.searchingCache.get(root);
    if (!_r0) {
      _r0 = new Map();
      this.searchingCache.set(root, _r0);
    }
    const r0 = _r0;
    const c = this.behaviorClients.get(root) || this.defaultBehaviorClient;
    if (c === undefined) {
      throw new Error('no client found');
    }
    if (typeof symbols === 'number' || symbols === undefined) {
      return c.getMostUsedFcts(root, symbols, true);
    } else {
      if (vscode.workspace.workspaceFolders === undefined) {
        throw new Error('no workspace');
      }
      if (vscode.workspace.workspaceFolders.length !== 1) {
        throw new Error("don't handle multi workspace");
      }
      // TODO URGENT make a local Location and a database location (with a particular scheme to notify it, and the authority set to root)
      return (await Promise.all(symbols.map<[string, string[]]>(x =>
        ([x, x.split(/:/g)])
      ).map(async ([path, pos]) => {
        let r = r0.get(path);
        if (!r) {
          r = await c.makeReq(['formatPath(path)', 'sl', 'sc', 'el', 'ec'], BehaviorStatsProvider.shiftLines2(pos), root, 1);
          r0.set(path, r);
        }
        return r;
      }))).reduce((acc, x) => (acc.push(...x), acc), []);
    }
  }
}
