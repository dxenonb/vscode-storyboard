import { BoardNode, Vec2d } from "./model";

export type SeqGraphMessage = UpdateGraph;

export interface UpdateGraph {
    command: 'UpdateGraph';
    nodes: BoardNode<Vec2d>[];
}
