import { NodeRef, Vec2d } from "./model-types";

export class StoryBoard<V extends Vec2d> {
    private nodes: Map<NodeRef, BoardNode<V>> = new Map();
    private edgesStartingAt: Map<NodeRef, NodeRef[]> = new Map();
    private edgesEndingAt: Map<NodeRef, NodeRef[]> = new Map();

    constructor() {

    }

    addNode(node: BoardNode<V>): void {
        this.nodes.set(node.ref, node);
    }

    connect(a: NodeRef, b: NodeRef): void
    connect(edge: BoardEdge): void
    connect(aEdge: NodeRef | BoardEdge, b?: NodeRef): void {
        if (isBoardEdge(aEdge)) {
            this.connect(aEdge.start, aEdge.end);
            return;
        }
        const a = aEdge;
        if (b === undefined) {
            throw new Error('b must not be undefined if a is not a BoardEdge');
        }
        const edgesTo = this.edgesStartingAt.get(a);
        if (edgesTo === undefined) {
            this.edgesStartingAt.set(a, [b]);
        } else {
            edgesTo.push(b);
        }
        const endingAt = this.edgesEndingAt.get(b);
        if (endingAt === undefined) {
            this.edgesEndingAt.set(b, [a]);
        } else {
            endingAt.push(b);
        }
    }
}

export class BoardNode<V extends Vec2d> {
    private color: string | null = null;
    private size: V | null = null;

    private header: string = '';
    private content: string = '';

    constructor(
        public readonly ref: NodeRef,
        private pos: V,
    ) { }
}

export class BoardEdge {
    constructor(
        public start: NodeRef,
        public end: NodeRef,
    ) { }
}

function isBoardEdge(edge: any): edge is BoardEdge {
    return edge.start && edge.end;
}
