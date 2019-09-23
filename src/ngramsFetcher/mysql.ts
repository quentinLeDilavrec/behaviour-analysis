import { Parser, BabelPath, toBabelPath } from "../utils/astThings";
import { Location } from "vscode";
import { createConnection } from "mysql";
import { NgramStats } from "../utils/behaviorTypes";
import { BehaviorDBClient } from "./behaviorClient";


export class BehaviorDBClientMysql implements BehaviorDBClient {
  private info: {
    host: string,
    port: number,
    user: string,
    password: string,
    database: string
  };
  constructor(user: string, host: string, database: string, password: string, port: number) {
    this.info = {
      user: user,
      host: host,
      database: database,
      password: password,
      port: port,
    };
  }
  getFct(l: any[], namespace?: string) {
    return 'CONCAT(' + l.map(x => namespace ? namespace + '.' + x : x).join(",':',") + ')';
  }
  genInitReq(cols: string[]) {
    // TODO remove fct identifier for performances in production
    // return [`SELECT ${getFct(['path', 'sl', 'sc', 'el', 'ec'])}, params, COUNT(*), SIGN(session) FROM CALLS
    return [`SELECT params, COUNT(*), SIGN(session) FROM CALLS
  WHERE root LIKE 'gut%' AND ` + cols.map(x => x + ' = ?').join(' AND '), 'init', (x: string) => x + `.fct0, ` + x + `.params0, `];
  }
  makeReq<T>(keys: string[], values: T[]) {
    const req = this.genInitReq(keys)[0] + `
  GROUP BY path, sl, sc, el, ec, params, SIGN(session)
  ORDER BY SIGN(session) DESC, COUNT(*) DESC
  `;
    const connection = createConnection(this.info);
    connection.connect();
    console.log(values.reduce((acc, x) => acc.replace('?', '' + x), req));
    return (new Promise<any[]>((resolve, reject) => connection.query(req, values, function (err: any, data: any[]) {
      if (err) {
        reject(err);
      }
      else {
        console.log(data);
        resolve(data);
      }
    }))).finally(() => connection.end());
  }
  getMostUsedFcts(min_size: number): Promise<{ path: string, sl: number, sc: number, pocc: number, tocc: number }[]> {
    throw new Error("Method not implemented.");
  }
}
