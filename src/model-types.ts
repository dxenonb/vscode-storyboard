export type NodeRef = string;
export type EdgeKey = string;

export type PersistentEditorState = EditorStateSaved | EditorStateUnsaved;

export interface EditorStateSaved {
    isSaved: true;
    fsPath: string;
}

export interface EditorStateUnsaved {
    isSaved: false;
    graph: BoardGraph<Vec2d>;
}

export interface BoardGraph<V extends Vec2d> {
    nodes: Map<NodeRef, BoardNode<V>>;
    edges: Map<EdgeKey, BoardEdge>;
}

export interface BoardNode<V extends Vec2d> {
    ref: NodeRef;
    pos: V;
    color: string | null;
    size: V | null;

    header: string;
    content: string;
}

export interface BoardEdge {
    start: NodeRef;
    end: NodeRef;
}

export type Vec2d = { x: number, y: number };
