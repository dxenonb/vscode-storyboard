const send = () => { };

type NodeRef = string;

class BoardManager {
    private nodeHost: HTMLElement;
    private canvasState: GraphCanvasState;

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
    }

    redrawCanvas() {
        redraw(this.canvasState);
    }

    createNode(nodeRef: NodeRef) {
        const el = createNode(nodeRefId(nodeRef));
        if (el) {
            this.nodeHost.appendChild(el);
            updateNode(el, { header: 'Hello world!' });
        }
    }
}

const manager = BoardManager.create('node-host', 'graph');

if (manager) {
    manager.redrawCanvas();
}
