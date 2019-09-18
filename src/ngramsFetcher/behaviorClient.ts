import { NgramStats } from "src/utils/behaviorTypes";

export interface BehaviorDBClient {
    makeReq<T>(keys: string[], values: T[], n?:number): Promise<NgramStats[]>;
    getMostUsedFcts(min_size?:number, params?:boolean): Promise<{ path: string, sl: number, sc: number, pocc: number, tocc: number }[]>;
}
