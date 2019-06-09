import { Parser, BabelPath, toBabelPath } from "./astThings";
import { Location } from "vscode";
import { createConnection } from "mysql";
type BehaviorStats = any;

const searchingCache = new Map<BabelPath, BehaviorStats>();
function getFct(l:any[], namespace?:string) {
    return 'CONCAT(' + l.map(x => namespace ? namespace + '.' + x : x).join(",':',") + ')'
  }
function genInitReq(cols: string[]) {
    // TODO remove fct identifier for performances in production
    // return [`SELECT ${getFct(['path', 'sl', 'sc', 'el', 'ec'])}, params, COUNT(*), SIGN(session) FROM CALLS
    return [`SELECT params, COUNT(*), SIGN(session) FROM CALLS
      WHERE root='gutenberg' AND ` + cols.map(x => x + ' = ?').join(' AND '), 'init', (x: string) => x + `.fct0, ` + x + `.params0, `];
}
function makeReq<T>(keys: string[], values: T[]) {
    const req = genInitReq(keys)[0] + `
        GROUP BY path, sl, sc, el, ec, params, SIGN(session)
        ORDER BY SIGN(session) DESC, COUNT(*) DESC
        `;
    const connection = createConnection({
        host: 'localhost',
        port: 9992,
        user: 'ubehaviour',
        password: 'password',
        database: 'behaviour'
    });
    connection.connect();
    console.log(values.reduce((acc,x)=>acc.replace('?',''+x),req));
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
export function invalidateFromDB() {
    searchingCache.clear();
}
export async function searching(location: Location): Promise<BehaviorStats> {
    location = Parser.mapping(location);
    const path = toBabelPath(location);
    let r = searchingCache.get(path);
    if (!r) {
        r = await makeReq(['path', 'sl', 'sc', 'el', 'ec'], Parser.locationToArray(location));
        searchingCache.set(path, r);
    }
    return r;
}
