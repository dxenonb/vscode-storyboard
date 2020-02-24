export type NodeRef = string;

export interface PersistentEditorState {
    fsPath: string;
    graph: BoardGraph<Vec2d>;
}

export interface BoardGraph<V extends Vec2d> {
    nodes: Map<NodeRef, BoardNode<V>>;
    edges: Array<{ start: NodeRef, end: NodeRef }>;
}

export interface BoardNode<V extends Vec2d> {
    ref: NodeRef;
    pos: V;
    color: string | null;
    size: V | null;

    header: string;
    content: string;
}

export type Vec2d = { x: number, y: number };
