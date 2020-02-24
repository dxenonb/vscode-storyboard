import { BoardNode, Vec2d } from "./model-types";

export type SeqGraphMessage
    = UpdateGraph
    | UpdateFilePath
    | UpdateTitle;

export interface UpdateGraph {
    command: 'UpdateGraph';
    nodes: BoardNode<Vec2d>[];
}

export interface UpdateFilePath {
    command: 'UpdateFilePath',
    fsPath: string;
}

export interface UpdateTitle {
    command: 'UpdateTitle',
    title: string;
}
