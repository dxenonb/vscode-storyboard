export type NodeRef = string;

export type Vec2d = { x: number, y: number };

export interface BoardNode<V extends Vec2d> {
    ref: NodeRef;
    pos: V;
    color: string | null;
    size: V | null;

    header: string;
    content: string;
}

export interface BoardGraph<V extends Vec2d> {
    nodes: Map<NodeRef, BoardNode<V>>;
    edges: Array<{ start: NodeRef, end: NodeRef }>;
}
