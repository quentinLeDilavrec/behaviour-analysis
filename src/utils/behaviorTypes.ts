import { Location, WorkspaceFolder } from "vscode";

export type NgramStats = {
  ngram: string[]
  shift: number
  pocc: number,
  tocc: number
};