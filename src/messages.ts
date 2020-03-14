import { BoardNode, Vec2d, BoardEdge } from "./model-types";

export type SeqGraphMessage
    = UpdateGraph
    | UpdateFilePath
    | UpdateTitle;

export interface UpdateGraph {
    command: 'UpdateGraph';
    nodes: BoardNode<Vec2d>[];
    edges: BoardEdge[];
}

export interface UpdateFilePath {
    command: 'UpdateFilePath',
    fsPath: string;
}

export interface UpdateTitle {
    command: 'UpdateTitle',
    title: string;
}
