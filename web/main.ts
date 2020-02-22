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

    private renderedNodes: Map<NodeRef, HTMLElement>;

    // TODO: Decouple nodes refs from physical element IDs
    // private idManager: IdAllocator;
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

        this.nodeRefManager = new IdAllocator();

        this.graph = {
            nodes: new Map(),
            edges: [],
        };

        this._idleState = { kind: 'idle' };
        this.boardState = this._idleState;

        this.registerListeners();
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

            content: 'test',
            header: 'testo',
        };

        this.graph.nodes.set(nodeRef, node);
        this.nodeHost.appendChild(el);
        this.renderedNodes.set(nodeRef, el);

        return nodeRef;
    }

    registerListeners() {
        const host = this.nodeHost;
        host.addEventListener('dblclick', (event) => {
            const el = this.findHeader(event.target);
            if (!el) {
                return;
            }
            if (this.boardState?.kind !== 'editingHeader') {
                this.cancelAction();
            } else if (this.boardState.input === el) {
                return;
            }
            const ref = nodeRefFromElement(el)!;
            this.boardState = {
                kind: 'editingHeader',
                input: el,
                ref,
            };
            el.disabled = false;
            el.focus();
        });
        const handleClickOff = (event: Event) => {
            const el = event.target;
            const state = this.boardState;
            if (state.kind === 'editingHeader') {
                if (state.input === el) {
                    return;
                } else {
                    event.preventDefault();
                    this.cancelAction();
                }
            }
        };
        host.addEventListener('click', handleClickOff);
        this.canvasHost.addEventListener('click', handleClickOff);
    }

    cancelAction() {
        if (this.boardState === null) {
            return;
        }

        if (this.boardState.kind === 'editingHeader') {
            const { ref, input } = this.boardState;
            const value = input.value;
            input.disabled = true;
            this.graph.nodes.get(ref)!.header = value;

            this.boardState = this._idleState;
        }
    }

    findHeader(el: EventTarget | null): HTMLInputElement | null {
        if (!el || !(el instanceof HTMLInputElement)) {
            return null;
        }
        if (el.matches('.node-header')) {
            return el;
        }
        return null;
    }
}

const manager = BoardManager.create('node-host', 'graph');

if (manager) {
    manager.initialDraw();
    manager.createNode();
} else {
    console.error('Board not initialized');
}
