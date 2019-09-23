import { Client, Pool } from 'pg';
import { from as copyFrom } from "pg-copy-streams";
import * as fs from "fs";
import { PassThrough, Transform } from "stream";
import { merge } from "event-stream";
import { Location } from "vscode";
import { resolve } from 'url';
import { NgramStats } from '../utils/behaviorTypes';
import { BehaviorClient } from 'behavior-trace-processing';


export class BehaviorClientDummy implements BehaviorClient {
  constructor(name: string) {

  }

  async makeReq<T>(keys: string[], values: T[], origin: string, n?: number): Promise<NgramStats[]> {
    throw new Error("not implemented yet");
  }

  async getMostUsedFcts(origin: string, min_size = 0, params = false): Promise<{ path: string, sl: number, sc: number, pocc: number, tocc: number }[]> {
    throw new Error("not implemented yet");
  }
}