import { CodeLens, Range, Uri, Location, WorkspaceFolder } from "vscode";
import { inspect } from "util";
import { BehaviorStatsProvider } from "./ngramsFetcher/behaviorStats";
import { symb_stats_t, resources_t } from "./view/contextView";
import { relative } from "path";

export class BehaviorCodeLens extends CodeLens {
    generalizedLoc: string;
    constructor(private stats: BehaviorStatsProvider, private root: WorkspaceFolder, private location: Location) {
        super(location.range);
        this.generalizedLoc = relative(root.uri.path, location.uri.path);
    }
    public async getCallStats(env: 'production' | 'test'): Promise<number>;
    public async getCallStats(): Promise<string>;
    public async getCallStats(env?: 'production' | 'test') {
        console.log(147, this.root.name, this.location);
        const o = await this.stats.searchingSymbols(this.root.name, [this.generalizedLoc+':'+[this.range.start.line,this.range.start.character,this.range.end.line,this.range.end.character].join(':')]);
        console.error('getCallStats', o);
        // TODO bench it compared to indexof |> slice
        // const tuple = o.reduce<[number, number]>(([prod, test], x) =>
        //     x['SIGN(session)'] === -1 ? [prod, test + x['COUNT(*)']] : [prod + x['COUNT(*)'], test], [0, 0]);
        // if (env === 'production') { return tuple[1]; }
        // if (env === 'test') { return tuple[0]; }
        // return tuple.join('/');
        if (env === 'production') { return o.reduce((acc, x) => acc + x.pocc, 0); }
        if (env === 'test') { return o.reduce((acc, x) => acc + x.tocc, 0); }
        return o.reduce((acc, x) => [acc[0] + x.pocc, acc[1] + x.tocc], [0, 0]).join('/');
    }

    public async getNgrams() {
        return await this.stats.searching(this.root.name, this.generalizedLoc, this.location.range);
    }

    public async getFastWebViewResources(): Promise<resources_t> {
        const o = await this.stats.searching(this.root.name, this.generalizedLoc, this.location.range);
        const symbols = new Set<string>();
        o.forEach(x => x.ngram.forEach(x => symbols.add(x)));
        const symbols_stats = {} as symb_stats_t;
        (await this.stats.searchingSymbols(this.root.name, [...symbols]))
            .forEach(x => {
                if (x.ngram.length !== 1) {
                    throw new Error(x + ' is not a symbol');
                }
                symbols_stats[x.ngram[0]] = {
                    pocc: x.pocc,
                    tocc: x.tocc
                };
            });
        return {
            symb_stats: symbols_stats,
            ngrams: o
        };
    }

    public async getWebViewResources(): Promise<resources_t> {
        const o = await this.stats.searching(this.root.name, this.generalizedLoc, this.location.range, true, true);
        const symbols = new Set<string>();
        o.forEach(x => x.ngram.forEach(x => symbols.add(x)));
        const symbols_stats = {} as symb_stats_t;
        (await this.stats.searchingSymbols(this.root.name, [...symbols]))
            .forEach(x => {
                if (x.ngram.length !== 1) {
                    throw new Error(x + ' is not a symbol');
                }
                symbols_stats[x.ngram[0]] = {
                    pocc: x.pocc,
                    tocc: x.tocc
                };
            });
        return {
            symb_stats: symbols_stats,
            ngrams: o
        };
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