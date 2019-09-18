import { Client } from 'pg';
import { from as copyFrom } from "pg-copy-streams";
import * as fs from "fs";
import { PassThrough, Transform } from "stream";
import { merge } from "event-stream";
import { Parser, BabelPath, toBabelPath } from "../utils/astThings";
import { Location } from "vscode";
import { resolve } from 'url';
import { NgramStats } from '../utils/behaviorTypes';
import { BehaviorDBClient } from './behaviorClient';
import { BehaviorDBClientPostgres } from './postgres';
import { BehaviorDBClientMysql } from './mysql';
import * as vscode from "vscode";
import { join } from 'path';

export class BehaviorStatsProvider {
  private searchingCache = new Map<BabelPath, NgramStats[]>();
  private behaviorDBClient: BehaviorDBClient;
  constructor(database_type: 'mysql' | 'postgres',user?:string,host?:string,database?:string,password?:string,port?:number) {
    if (database_type === 'postgres') {
      this.behaviorDBClient = new BehaviorDBClientPostgres(
          user||'ubehavior',
          host||'localhost',
          database||'behaviordb',
          password||'password',
          port||5432,
        );
    } else if (database_type === 'mysql') {
      this.behaviorDBClient = new BehaviorDBClientMysql(
        user||'ubehavior',
        host||'localhost',
        database||'behaviordb',
        password||'password',
        port||5432,
        );
    } else {
      throw new Error(`${database_type} is not a valid database type.`);
    }
  }

  invalidateFromDB() {
    this.searchingCache.clear();
  }

  async searching(location: Location, morePrev = false, moreNext = false) {
    location = Parser.mapping(location);
    const path = toBabelPath(location);
    let r = this.searchingCache.get(path);
    console.log('loc ', location, Parser.locationToArray(location),
      morePrev, moreNext, r);
    if (r === undefined || r.length < 2) {
      r = await this.behaviorDBClient.makeReq(['formatPath(path)', 'sl', 'sc', 'el', 'ec'], Parser.locationToArray(location), 2);
      this.searchingCache.set(path, r);
    } else if (morePrev || moreNext) { // TODO use the next branch
      r = await this.behaviorDBClient.makeReq(['formatPath(path)', 'sl', 'sc', 'el', 'ec'], Parser.locationToArray(location), 3);
      this.searchingCache.set(path, r);
    } else if (r && r.length > 1 && (morePrev || moreNext)) { // TODO don't seem to work
      r = await this.behaviorDBClient.makeReq(['formatPath(path)', 'sl', 'sc', 'el', 'ec'], Parser.locationToArray(location), 3);
      this.searchingCache.set(path, r);
    } else if (false) { // use for update, maybe a timer?
      r = await this.behaviorDBClient.makeReq(['formatPath(path)', 'sl', 'sc', 'el', 'ec'], Parser.locationToArray(location));
      // this.searchingCache.set(path, r);
    }
    return r;
  }

  async searchingSymbols(symbols: (Location | string)[]): Promise<NgramStats[]>;
  async searchingSymbols(symbols?: number): Promise<{ path: string; sl: number; sc: number; pocc: number; tocc: number; }[]>;
  async searchingSymbols(symbols?: (Location | string)[] | number) { // TODO use uri somewhere
    // let r = []
    // symbols.forEach(path=>{
    //   let tmp = this.searchingCache.get(path);
    // })
    if (typeof symbols === 'number' || symbols===undefined) {
      return this.behaviorDBClient.getMostUsedFcts(symbols,true);
    } else {
      if (vscode.workspace.workspaceFolders === undefined) {
        throw new Error('no workspace');
      }
      if (vscode.workspace.workspaceFolders.length !== 1) {
        throw new Error("don't handle multi workspace");
      }
      const workspace_root_dir = vscode.workspace.workspaceFolders[0].uri.toString(); // TODO try to avoid using this kinds of tricks
      return (await Promise.all(symbols.map<[string, string[]]>(x =>
        typeof x === 'string' ?
          [join(workspace_root_dir, x), x.split(':')] :
          [toBabelPath(x, 1), toBabelPath(x, 1).slice(workspace_root_dir.length + 1).split(':')]
      ).map(async ([path, pos]) => {
        let r = this.searchingCache.get(path);
        if (!r) {
          r = await this.behaviorDBClient.makeReq(['formatPath(path)', 'sl', 'sc', 'el', 'ec'], pos, 1);
          this.searchingCache.set(path, r);
        }
        return r;
      }))).reduce((acc, x) => (acc.push(...x), acc), []);
    }
  }
}
