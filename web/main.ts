const MAIN_CONTEXT_MENU_OPTIONS = [
    { action: 'createNode', text: 'New Node', aliases: null },
];

function edgeKey(edge: BoardEdge): EdgeKey {
    return `${edge.start}-${edge.end}`;
}

class Camera {
    public zoom: number;

    private upperLeft: Vec2d;
    private _center: Vec2d;
    private _extents: Vec2d;
    private halfExtents: Vec2d;

    public get center(): Vec2d {
        return this._center;
    }

    public set center(value: Vec2d) {
        this._center = value;
        this.upperLeft = value.clone().sub(this.halfExtents);
    }

    public set extents(extents: Vec2d) {
        this._extents = extents;
        this.halfExtents = extents.clone().scale(0.5);
    }

    constructor(width: number, height: number) {
        this.zoom = 1;
        this._center = new Vec2d(0, 0);

        this._extents = new Vec2d(width, height);
        this.halfExtents = new Vec2d(width / 2, height / 2);

        this.upperLeft = this.center.clone().sub(this.halfExtents);
    }

    cssNodeScale() {
        return `scale(${this.zoom})`;
    }

    /// Get the position of an object in graph space (e.g. a node's position)
    /// relative to the viewport (origin in the upper left).
    ///
    /// Operates directly on the argument.
    graphToCameraPos(graphPos: Vec2d) {
        return graphPos.sub(this.center).add(this.halfExtents);
    }
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
    private graphRenderer: GraphRenderer;
    private contextMenu: ContextMenu;

    private renderedNodes: Map<NodeRef, RawNodeWrapper>;
    private eventRx: BoardMessageReceiver;

    private nodeRefManager: IdAllocator;

    private graph: BoardGraph;
    private camera: Camera;

    private boardState: BoardState;
    private _idleState: BoardState;

    static create(api: VsCodeApi, nodeHostId: string, graphId: string): BoardManager | null {
        const nodeHost = document.getElementById(nodeHostId);
        const canvasHost = document.getElementById(graphId);

        if (nodeHost && canvasHost instanceof HTMLCanvasElement) {
            return new BoardManager(api, nodeHost, canvasHost);
        } else {
            return null;
        }
    }

    constructor(
        api: VsCodeApi,
        nodeHost: HTMLElement,
        canvasHost: HTMLCanvasElement,
    ) {
        this.api = api;
        this.nodeHost = nodeHost;
        this.canvasHost = canvasHost;
        this.eventRx = { send: this.receiveMessage.bind(this) };

        const ctx = canvasHost.getContext('2d');
        if (ctx === null) {
            throw new Error('Very unlikely to happen... ctx was null!');
        }

        const wireColor = vsCodeCssVariable(
            'gitDecoration-conflictingResourceForeground',
            'rgb(17, 73, 146)',
        );
        const gridColor = vsCodeCssVariable(
            'editorInfo-border', // not working?
            'rgba(0, 0, 0, 0.5)'
        );
        this.graphRenderer = new GraphRenderer(
            ctx,
            wireColor,
            gridColor,
            this.eventRx,
        );

        this.contextMenu = new ContextMenu();

        this.renderedNodes = new Map();

        this.nodeRefManager = new IdAllocator();

        this.graph = {
            nodes: new Map(),
            edges: new Map(),
        };
        this.camera = new Camera(
            ctx.canvas.clientWidth,
            ctx.canvas.clientHeight,
        );

        this._idleState = { kind: 'idle', selected: [] };
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
        window.addEventListener('wheel', (event) => {
            const dir = event.deltaY < 0 ? 1 : -1;
            const amt = 1.4;

            let zoom = this.camera.zoom;
            zoom *= dir > 0 ? amt : 1 / amt;
            zoom = Math.min(Math.max(zoom, 1 / 4), 10);
            this.camera.zoom = zoom;

            this.graphRenderer.setCamera(new Vec2d(0, 0), this.camera.zoom);
            this.graphRenderer.render();
        });
    }

    initialDraw() {
        this.graphRenderer.render();
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
        rendered.attach(
            node,
            this.camera.graphToCameraPos(node.pos.clone()),
            this.camera.zoom,
        );
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

        node.position = this.camera.graphToCameraPos(modelNode.pos.clone());
        node.scale = this.camera.zoom;
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
            const ref = message.node;
            this.setSelected(ref);
            this.boardState = {
                kind: 'draggingNode',
                ref,
                start: message.pos,
            };
        } else if (message.kind === 'UpdateContent') {
            this.updateNode(message.node, 'content', message.content);
            this.saveNode(message.node);
        } else if (message.kind === 'UpdateHeader') {
            this.updateNode(message.node, 'header', message.content);
            this.saveNode(message.node);
        } else if (message.kind === 'SelectSocket') {
            const { mousePos, isByHead, node } = message;
            this.cancelAction();
            this.boardState = {
                kind: 'draggingWire',
                source: node,
                mousePos,
                isByHead,
            };
            this.listenDrag(true);
        } else if (message.kind === 'SelectCanvas') {
            this.cancelAction();
            // TODO: Drag canvas
        } else if (message.kind === 'MouseUpHeader') {
            const state = this.boardState;
            if (state.kind !== 'draggingNode') {
                return;
            }
            this.cancelAction();
            this.saveNode(message.node);
        } else if (message.kind === 'MouseUpCanvas') {
            if (this.boardState.kind !== 'draggingWire') {
                return;
            }
            this.cancelAction();
        } else if (message.kind === 'MouseUpSocket') {
            if (this.boardState.kind !== 'draggingWire') {
                return;
            }
            const { source, isByHead } = this.boardState;
            const fromSocket = isByHead ? 'right' : 'left';
            const target = message.node;
            const toSocket = message.socket;
            this.cancelAction();
            if (toSocket === fromSocket || source === target) {
                return;
            }
            let start = source;
            let end = target;
            if (!isByHead) {
                const t = end;
                end = start;
                start = t;
            }
            const edge = { start, end };
            this.graph.edges.set(edgeKey(edge), edge);
            this.saveEdge(edge);
            this.graphRenderer.updateConnections(this.graph.edges);
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
        if (state.kind === 'draggingNode') {
            const pos = new Vec2d(event.x, event.y);
            const delta = pos.clone().sub(state.start);
            state.start = pos;
            this.moveNode(state.ref, delta);
            this.graphRenderer.render();
        } else if (state.kind === 'draggingWire') {
            const pos = new Vec2d(event.x, event.y);
            state.mousePos = pos;
            this.graphRenderer.updateFloatingWire(state);
        }
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
        this.graphRenderer.updateFloatingWire(null);
    }

    setSelected(ref: NodeRef | null) {
        this.renderedNodes.forEach((node) => {
            if (node.ref === ref) {
                node.select();
            } else {
                node.deselect();
            }
        });
    }

    // TODO: Better encapsulate things so that this always gets called
    saveNode(ref: NodeRef) {
        const node = this.graph.nodes.get(ref)!;
        this.postMessage({
            command: 'UpdateGraph',
            nodes: [node],
            edges: [],
        });
    }

    saveEdge(edge: BoardEdge) {
        this.postMessage({
            command: 'UpdateGraph',
            nodes: [],
            edges: [edge],
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
            rendered.attach(
                node,
                this.camera.graphToCameraPos(node.pos.clone()),
                this.camera.zoom,
            );
        }
        for (const edge of message.edges) {
            this.graph.edges.set(edgeKey(edge), edge);
        }
        this.nodeRefManager.analyze(
            this.graph.nodes.values(),
            (node: BoardNode) => node.ref,
        );
        this.graphRenderer.updateConnections(this.graph.edges);
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

function vsCodeCssVariable(name: string, elseValue: string) {
    const bodyStyle = getComputedStyle(document.body);
    const property = `--vscode-${name}`;
    return bodyStyle.getPropertyValue(property) || elseValue;
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
