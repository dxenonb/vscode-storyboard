interface GraphCanvasState {
    ctx: CanvasRenderingContext2D;
    connections: Set<BoardEdge>;
    floatingWire: FloatingWire | null;
    center: Vec2d;
    zoom: number;
}

interface FloatingWire {
    source: NodeRef;
    isByHead: boolean;
    mousePos: Vec2d;
}

interface GraphCanvasOptions {
    wireColor: string;
    gridColor: string;
}

/// Renders the gridlines and wires for the sequence graph.
class GraphRenderer {

    private options: GraphCanvasOptions;
    private state: GraphCanvasState;

    constructor(
        ctx: CanvasRenderingContext2D,
        wireColor: string,
        gridColor: string,
        eventTx: BoardMessageReceiver,
    ) {
        this.options = {
            wireColor,
            gridColor,
        };

        const connections: Set<BoardEdge> = new Set();
        const floatingWire = null;
        const center = new Vec2d(0, 0);
        const zoom = 1.0;
        const state: GraphCanvasState = {
            ctx,
            connections,
            floatingWire,
            center,
            zoom,
        };

        const canvas = ctx.canvas;
        window.addEventListener('resize', () => this.fitCanvasToWindow());

        canvas.addEventListener('mouseup', (e) => {
            eventTx.send({
                kind: 'MouseUpCanvas',
                mousePos: new Vec2d(e.clientX, e.clientY),
            });
        });

        this.state = state;

        this.fitCanvasToWindow();
    }

    setCamera(
        center: Vec2d,
        zoom: number,
    ) {
        const state = this.state;
        state.center = center;
        state.zoom = zoom;
    }

    private computeExtents() {
        const { center, zoom, ctx } = this.state;
        const canvas = new Vec2d(
            ctx.canvas.clientWidth,
            ctx.canvas.clientHeight,
        ).scale(1 / zoom);
        const topLeft = center.clone().sub(canvas);
        const bottomRight = center.clone().add(canvas);
        return { topLeft, bottomRight };
    }

    fitCanvasToWindow() {
        const canvas = this.state.ctx.canvas;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        this.render();
    }

    updateFloatingWire(wire: FloatingWire | null) {
        this.state.floatingWire = wire;
        this.render();
    }

    updateConnections(connections: Map<EdgeKey, BoardEdge>) {
        for (const [key, edge] of connections.entries()) {
            this.state.connections.add(edge);
        }
        this.render();
    }

    render() {
        const options = this.options;
        const state = this.state;

        requestAnimationFrame(() => {
            const { ctx, connections, floatingWire, zoom } = state;
            const resolved = [];
            for (const [_, { start, end }] of connections.entries()) {
                const first = nodeSocketRect(start, true);
                const second = nodeSocketRect(end, false);
                if (!first || !second) {
                    resolved.push({ start: null, end: null });
                } else {
                    resolved.push({
                        start: { x: first.right, y: (first.top + first.bottom) / 2.0 },
                        end: { x: second.left, y: (second.top + second.bottom) / 2.0 },
                    });
                }
            };

            ctx.save();

            // TODO: everything will need to handle DPI and transformations
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            drawGrid(this.state, this.options, this.computeExtents());

            // TODO: Specify curves in world space
            const flair = 100 * zoom;

            for (const { start, end } of resolved) {
                if (start === null || end === null) {
                    continue;
                }

                const cp1 = { x: start.x + flair, y: start.y };
                const cp2 = { x: end.x - flair, y: end.y };

                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);

                ctx.strokeStyle = options.wireColor;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            if (floatingWire !== null) {
                const { source: [node, socket], isByHead, mousePos } = floatingWire;
                const rect = nodeSocketRect(node, isByHead);
                if (rect !== null) {
                    const y = (rect.top + rect.bottom) / 2.0;
                    // if isByHead, then we are dragging from an input, else from an output
                    const origin = isByHead ? { x: rect.right, y } : { x: rect.left, y };

                    const flipFactor = isByHead ? 1 : -1;
                    const start = origin;
                    const end = mousePos;

                    const cp1 = { x: start.x + flair * flipFactor, y: start.y };
                    const cp2 = { x: end.x - flair * flipFactor, y: end.y };

                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);

                    ctx.strokeStyle = options.wireColor;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

            ctx.restore();
        });
    }
}

const nodeRefId = (nodeRef: string) => 'node-ref-' + nodeRef;

const nodeSocketRect = (nodeRef: string, isRightSocket: boolean) => {
    const id = nodeRefId(nodeRef);
    const e = document.getElementById(id);
    if (!e) {
        return null;
    }
    const sElement = isRightSocket
        ? e.querySelector('.node-socket:last-child')
        : e.querySelector('.node-socket:first-child');
    return sElement && sElement.getBoundingClientRect();
};

const drawGrid = (
    state: GraphCanvasState,
    options: GraphCanvasOptions,
    { topLeft, bottomRight }: { topLeft: Vec2d, bottomRight: Vec2d }
) => {
    const strokeStyle = options.gridColor;
    // width of major and minor lines
    const majorWidth = 1.0;
    const minorWidth = 0.5;
    // grid spacing in pixels between minor increments
    const gridSpacing = 25;
    // the nth grid line will be a major line
    const majorFrequency = 4;

    const { ctx, center, zoom } = state;

    ctx.save();

    ctx.strokeStyle = strokeStyle;
    // center the origin
    ctx.translate(ctx.canvas.clientWidth / 2, ctx.canvas.clientHeight / 2);
    ctx.translate(-center.x, -center.y);
    ctx.scale(zoom, zoom);

    const leftEdge = topLeft.x;
    const topEdge = topLeft.y;
    const rightEdge = bottomRight.x;
    const bottomEdge = bottomRight.y;

    drawGridLines(
        ctx,
        true,
        { start: leftEdge, end: rightEdge },
        { start: topEdge, end: bottomEdge },
        gridSpacing,
        majorFrequency,
        { major: majorWidth, minor: minorWidth }
    );

    drawGridLines(
        ctx,
        false,
        { start: topEdge, end: bottomEdge },
        { start: leftEdge, end: rightEdge },
        gridSpacing,
        majorFrequency,
        { major: majorWidth, minor: minorWidth }
    );

    ctx.restore();
};

// Draw grid lines for one axis.
//
// isVert - whether these lines run vertically or not
const drawGridLines = (ctx: CanvasRenderingContext2D, isVert: boolean, bounds: { start: number; end: number; }, crossBounds: { start: number; end: number; }, spacing: number, majorFreq: number, widths: { major: number; minor: number; }) => {
    const { major: majorWidth, minor: minorWidth } = widths;
    const { start, end } = bounds;

    let i = Math.floor(start / spacing) * spacing;
    while (i < end) {
        const lineIndex = Math.round(i / spacing);
        const isMajorIncrement = lineIndex % majorFreq === 0;
        const width = isMajorIncrement? majorWidth : minorWidth;

        ctx.beginPath();

        const { start, end } = isVert
            ? { start: { x: i, y: crossBounds.start }, end: { x: i, y: crossBounds.end} }
            : { start: { x: crossBounds.start, y: i }, end: { x: crossBounds.end, y: i} };
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineWidth = width;
        ctx.stroke();

        i += spacing;
    }
};
