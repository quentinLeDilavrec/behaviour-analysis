import { CodeLens, Range, Uri, Location } from "vscode";
import { Parser, FctId_t, NodePath } from "./astThings";
import { inspect } from "util";
import { createConnection } from "mysql";
import { searching } from "./BehaviorStats";

export class BehaviorCodeLens extends CodeLens {
    constructor(private location: Location) {//, private parser:Parser, private path:string, private uri?: Uri) {
        super(location.range);
    }
    public async getCallStats(env: 'production' | 'test'): Promise<number>;
    public async getCallStats(): Promise<string>;
    public async getCallStats(env?: 'production' | 'test') {
        const o: any[] = await searching(this.location);
        // TODO bench it compared to indexof |> slice
        const tuple = o.reduce<[number, number]>(([prod, test], x) =>
            x['SIGN(session)'] === -1 ? [prod, test + x['COUNT(*)']] : [prod + x['COUNT(*)'], test], [0, 0]);
        if (env === 'production') { return tuple[1]; }
        if (env === 'test') { return tuple[0]; }
        return tuple.join('/');
    }

    public toString(appConfig?: any): string {
        return inspect(this.location);//this.model.toString(appConfig.getMySettings(this.uri));
    }

    public getExplanation(appConfig?: any): string {
        return 'returned from MyCodeLens.getExplanation';//this.model.getExplanation();
    }

    // private l: Map<string, BehaviorCodeLens> = new Map();
    // public static factory(location: Location) {
    //     return new BehaviorCodeLens(location);
    // }
}

// export let behaviorCodeLens = BehaviorCodeLens.factory;