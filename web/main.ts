const send = () => { };

const MAIN_CONTEXT_MENU_OPTIONS = [
    { action: 'createNode', text: 'New Node', aliases: null },
];

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

    analyze<T, E extends Iterable<T>>(incoming: E, map: (item: T) => string) {
        let maxUsed = this.nextId - 1;
        for (const id of incoming) {
            const val = parseInt(map(id), 10);
            if (isNaN(val)) {
                continue;
            }
            maxUsed = Math.max(maxUsed, val);
        }
        this.nextId = maxUsed + 1;
    }
}

class BoardManager {
    private api: VsCodeApi;
    private nodeHost: HTMLElement;
    private canvasHost: HTMLElement;
    private canvasState: GraphCanvasState;
    private contextMenu: ContextMenu;

    private renderedNodes: Map<NodeRef, RawNodeWrapper>;
    private eventRx: BoardMessageReceiver;

    private nodeRefManager: IdAllocator;

    private graph: BoardGraph;

    private boardState: BoardState;
    private _idleState: BoardState;

    static create(api: VsCodeApi, nodeHostId: string, graphId: string): BoardManager | null {
        const nodeHost = document.getElementById(nodeHostId);
        const canvasHost = document.getElementById(graphId);
        const canvasState = initializeCanvas(graphId, { send }, { send });

        if (nodeHost && canvasHost && canvasState) {
            return new BoardManager(api, nodeHost, canvasHost, canvasState);
        } else {
            return null;
        }
    }

    constructor(
        api: VsCodeApi,
        nodeHost: HTMLElement,
        canvasHost: HTMLElement,
        canvasState: GraphCanvasState,
    ) {
        this.api = api;
        this.nodeHost = nodeHost;
        this.canvasHost = canvasHost;
        this.canvasState = canvasState;
        this.contextMenu = new ContextMenu();

        this.renderedNodes = new Map();
        this.eventRx = { send: this.receiveMessage.bind(this) };

        this.nodeRefManager = new IdAllocator();

        this.graph = {
            nodes: new Map(),
            edges: [],
        };

        this._idleState = { kind: 'idle' };
        this.boardState = this._idleState;

        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.registerListeners();
    }

    registerListeners() {
        this.canvasHost.addEventListener('click', () => {
            this.receiveMessage({ kind: 'SelectCanvas' });
        });
        this.nodeHost.addEventListener('click', (event) => {
            if (this.contextMenu.spawnedEvent(event)) {
                // ignore events from inside the context menu
                return;
            }

            this.cancelAction();
        });
        this.canvasHost.addEventListener('contextmenu', (event) => {
            const pos = new Vec2d(event.x, event.y);
            this.contextMenu.activate(
                this.nodeHost,
                pos,
                MAIN_CONTEXT_MENU_OPTIONS,
            ).then((action) => {
                if (action === 'createNode') {
                    this.createNode(pos);
                }
            });
        });
    }

    initialDraw() {
        redraw(this.canvasState);
    }

    createNode(pos: Vec2d) {
        // Create the node in the model
        const nodeRef = this.nodeRefManager.alloc().toString();
        const node: BoardNode = {
            ref: nodeRef,
            pos,
            color: null,
            size: null,

            content: '',
            header: '',
        };
        this.graph.nodes.set(nodeRef, node);

        // Render the node
        const rendered = new RawNodeWrapper(this.nodeHost, this.eventRx);
        rendered.attach(node);
        this.renderedNodes.set(nodeRef, rendered);

        return nodeRef;
    }

    moveNode(ref: NodeRef, delta: Vec2d) {
        const modelNode = this.graph.nodes.get(ref)!;
        modelNode.pos.add(delta);

        const node = this.renderedNodes.get(ref);
        if (!node) {
            return;
        }
        // TODO: Handle camera
        node.position = modelNode.pos;
        node.render();
    }

    updateNode(ref: NodeRef, field: 'header' | 'content', value: string) {
        const modelNode = this.graph.nodes.get(ref)!;
        modelNode[field] = value;

        const node = this.renderedNodes.get(ref);
        if (!node) {
            return;
        }

        node[field] = value;
        node.render();
    }

    getRendered(ref: NodeRef): RawNodeWrapper {
        const n = this.renderedNodes.get(ref);
        if (!n) {
            throw new Error(`Expected node ${ref}, but it did not exist`);
        }
        return n;
    }

    receiveMessage(message: BoardMessage) {
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
            const state = this.boardState;
            if (state.kind === 'editingHeader' && state.ref === message.node) {
                return;
            }
            this.cancelAction();
            this.listenDrag(true);
            this.boardState = {
                kind: 'draggingNode',
                ref: message.node,
                start: message.pos,
            };
        } else if (message.kind === 'UpdateContent') {
            this.updateNode(message.node, 'content', message.content);
            this.saveNode(message.node);
        } else if (message.kind === 'UpdateHeader') {
            this.updateNode(message.node, 'header', message.content);
            this.saveNode(message.node);
        } else if (message.kind === 'SelectCanvas') {
            this.cancelAction();
            // TODO: Drag canvas
        } else if (message.kind === 'MouseUpHeader') {
            if (this.boardState.kind !== 'draggingNode') {
                return;
            }
            this.cancelAction();
            this.saveNode(message.node);
        }
    }

    listenDrag(listen: boolean) {
        if (!listen) {
            window.removeEventListener('mousemove', this.handleMouseMove);
            return;
        }
        window.addEventListener('mousemove', this.handleMouseMove);
    }

    handleMouseMove(event: MouseEvent) {
        const state = this.boardState;
        if (state.kind !== 'draggingNode') {
            return;
        }
        const pos = new Vec2d(event.x, event.y);
        const delta = pos.clone().sub(state.start);
        state.start = pos;
        this.moveNode(state.ref, delta);
    }

    cancelAction() {
        const state = this.boardState;
        if (state.kind === 'editingHeader') {
            const node = this.getRendered(state.ref);
            node.lockHeader();
            this.boardState = this._idleState;
        }
        this.contextMenu.deactivate();
        this.listenDrag(false);
    }

    // TODO: Better encapsulate things so that this always gets called
    saveNode(ref: NodeRef) {
        const node = this.graph.nodes.get(ref)!;
        this.postMessage({
            command: 'UpdateGraph',
            nodes: [node],
        });
    }

    postMessage(message: SeqGraphMessage) {
        this.api.postMessage(message);
    }

    receiveBackendMessage(message: SeqGraphMessage) {
        console.log('Got backend message:', message);
        if (message.command === 'UpdateGraph') {
            this.handleMessageUpdateGraph(message);
        } else if (message.command === 'UpdateFilePath') {
            this.handleMessageUpdateFilePath(message);
        }
    }

    handleMessageUpdateGraph(message: UpdateGraph) {
        for (const naked of message.nodes) {
            const node = hydrateBoardNode(naked);
            this.graph.nodes.set(node.ref, node);
            let rendered = this.renderedNodes.get(node.ref);
            if (!rendered) {
                rendered = new RawNodeWrapper(this.nodeHost, this.eventRx);
                this.renderedNodes.set(node.ref, rendered);
            }
            rendered.attach(node);
        }
        this.nodeRefManager.analyze(
            this.graph.nodes.values(),
            (node: BoardNode) => node.ref,
        );
    }

    handleMessageUpdateFilePath(message: UpdateFilePath) {
        // TODO: We should really work on packaging so we can use `path` utils
        const { fsPath } = message;
        if (fsPath.length === 0) {
            this.postMessage({
                command: 'UpdateTitle',
                title: 'unknown (board)',
            });
            return;
        }
        const separator = !!navigator.userAgent.match(/Win(?:32|64);/)
            ? '\\'
            : '/';
        const baseNameIndex = fsPath.lastIndexOf(separator);
        let baseName = baseNameIndex !== -1
            ? fsPath.slice(baseNameIndex + 1)
            : fsPath;
        baseName = baseName.replace('.seqgraph.json', '');
        const prettyName = `${baseName} (board)`;
        this.postMessage({
            command: 'UpdateTitle',
            title: prettyName,
        });
        this.api.setState({
            isSaved: true,
            fsPath,
        });
    }
}

// TODO: Use this for saving unsaved boards to the PersistentBoardState
// function instrumentNodes(map: Map<NodeRef, BoardNode>, api: VsCodeApi) {
//     map.set = function (prop, value) {
//         Map.prototype.set.call(this, prop, value);
//         // TODO: Serialize nodes... again... (should change the format I
//         // suppose since we have to do this everywhere)
//         return this;
//     };
// }

function hydrateBoardNode(node: IncomingBoardNode): BoardNode {
    node.pos = Vec2d.wrap(node.pos);
    node.size = node.size && Vec2d.wrap(node.size);
    return node as BoardNode;
}

// use an IIFE to hide the manager from the global scope
// (we must not let the webview panel fall into the global scope)
(() => {
    const api = acquireVsCodeApi();
    const manager = BoardManager.create(api, 'node-host', 'graph');

    if (manager) {
        window.addEventListener('message', (event) => {
            const message: SeqGraphMessage = event.data;
            manager.receiveBackendMessage(message);
        });

        manager.initialDraw();
    } else {
        console.error('Board not initialized');
        // TODO: Send an error message
    }
})();
