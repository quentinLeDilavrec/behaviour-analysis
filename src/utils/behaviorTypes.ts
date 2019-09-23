import { Location, WorkspaceFolder } from "vscode";

export type NgramStats = {
  ngram: string[]
  shift: number
  pocc: number,
  tocc: number
};

export interface GeneralLocation extends Location {
  origin:WorkspaceFolder;
}