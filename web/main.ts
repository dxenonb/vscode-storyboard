const send = () => { };

type NodeRef = string;

class Vec2d {
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    clone() {
        return new Vec2d(this.x, this.y);
    }

    add(vec: Vec2d) {
        this.x += vec.x;
        this.y += vec.y;
    }

    scale(x: number, y?: number) {
        this.x *= x;
        if (y) {
            x = y;
        }
        this.y *= x;
    }
}

interface BoardNode {
    ref: NodeRef;
    pos: Vec2d;
    color: string | null;
    size: Vec2d | null;
}

interface BoardGraph {
    nodes: Map<NodeRef, BoardNode>;
    edges: Array<{ start: NodeRef, end: NodeRef }>;
}

class IdAllocator {
    private nextId: number;

    constructor() {
        this.nextId = 0;
    }

    alloc() {
        const id = this.nextId;
        this.nextId += 1;
        return id;
    }
}

class BoardManager {
    private nodeHost: HTMLElement;
    private canvasState: GraphCanvasState;

    private renderedNodes: Map<NodeRef, HTMLElement>;

    // TODO: Decouple nodes refs from physical element IDs
    // private idManager: IdAllocator;
    private nodeRefManager: IdAllocator;

    private graph: BoardGraph;

    static create(nodeHostId: string, graphId: string): BoardManager | null {
        const nodeHost = document.getElementById(nodeHostId);
        const canvasState = initializeCanvas(graphId, { send }, { send });

        if (nodeHost && canvasState) {
            return new BoardManager(nodeHost, canvasState);
        } else {
            return null;
        }
    }

    constructor(nodeHost: HTMLElement, canvasState: GraphCanvasState) {
        this.nodeHost = nodeHost;
        this.canvasState = canvasState;

        this.renderedNodes = new Map();

        this.nodeRefManager = new IdAllocator();

        this.graph = {
            nodes: new Map(),
            edges: [],
        };
    }

    initialDraw() {
        redraw(this.canvasState);
    }

    createNode() {
        const nodeRef = this.nodeRefManager.alloc().toString();

        const el = initNode(nodeRefId(nodeRef));
        updateNodeRef(el, nodeRef);

        const node: BoardNode = {
            ref: nodeRef,
            pos: new Vec2d(0, 0),
            color: null,
            size: null,
        };

        this.graph.nodes.set(nodeRef, node);
        this.nodeHost.appendChild(el);
        this.renderedNodes.set(nodeRef, el);

        return nodeRef;
    }
}

const manager = BoardManager.create('node-host', 'graph');

if (manager) {
    manager.initialDraw();
    manager.createNode();
} else {
    console.error('Board not initialized');
}
