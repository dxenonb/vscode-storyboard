const send = () => { };

type NodeRef = string;

interface BoardNode {
    ref: NodeRef;
    pos: Vec2d;
    color: string | null;
    size: Vec2d | null;

    header: string;
    content: string;
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
    private canvasHost: HTMLElement;
    private canvasState: GraphCanvasState;

    private renderedNodes: Map<NodeRef, RawNodeWrapper>;
    private eventRx: BoardMessageReceiver;

    private nodeRefManager: IdAllocator;

    private graph: BoardGraph;

    private boardState: BoardState;
    private _idleState: BoardState;

    static create(nodeHostId: string, graphId: string): BoardManager | null {
        const nodeHost = document.getElementById(nodeHostId);
        const canvasHost = document.getElementById(graphId);
        const canvasState = initializeCanvas(graphId, { send }, { send });

        if (nodeHost && canvasHost && canvasState) {
            return new BoardManager(nodeHost, canvasHost, canvasState);
        } else {
            return null;
        }
    }

    constructor(
        nodeHost: HTMLElement,
        canvasHost: HTMLElement,
        canvasState: GraphCanvasState,
    ) {
        this.nodeHost = nodeHost;
        this.canvasHost = canvasHost;
        this.canvasState = canvasState;

        this.renderedNodes = new Map();
        this.eventRx = { send: this.receiveMessage.bind(this) };

        this.nodeRefManager = new IdAllocator();

        this.graph = {
            nodes: new Map(),
            edges: [],
        };

        this._idleState = { kind: 'idle' };
        this.boardState = this._idleState;
    }

    initialDraw() {
        redraw(this.canvasState);
    }

    createNode() {
        // Create the node in the model
        const nodeRef = this.nodeRefManager.alloc().toString();
        const pos = new Vec2d(100, 100);
        const node: BoardNode = {
            ref: nodeRef,
            pos,
            color: null,
            size: null,

            content: 'test',
            header: 'testo',
        };
        this.graph.nodes.set(nodeRef, node);

        // Render the node
        const rendered = new RawNodeWrapper(this.nodeHost, this.eventRx);
        rendered.attach(pos, nodeRef);
        this.renderedNodes.set(nodeRef, rendered);

        return nodeRef;
    }

    getRendered(ref: NodeRef): RawNodeWrapper {
        const n = this.renderedNodes.get(ref);
        if (!n) {
            throw new Error(`Expected node ${ref}, but it did not exist`);
        }
        return n;
    }

    receiveMessage(message: BoardMessage) {
        console.log('Got message!', message);

        const state = this.boardState;
        if (message.kind === 'DblClickHeader') {
            const node = this.getRendered(message.node);
            node.unlockHeader();
            if (state.kind === 'editingHeader' && state.ref !== message.node) {
                const prev = this.getRendered(state.ref);
                prev.lockHeader();
            }
            this.boardState = { kind: 'editingHeader', ref: message.node };
        } else if (message.kind === 'SelectHeader') {

        } else if (message.kind === 'UpdateContent') {

        } else if (message.kind === 'UpdateHeader') {

        } else if (message.kind === 'SelectCanvas') {

        } else if (message.kind === 'Drag') {

        }
    }
}

const manager = BoardManager.create('node-host', 'graph');

if (manager) {
    manager.initialDraw();
    manager.createNode();
} else {
    console.error('Board not initialized');
}
