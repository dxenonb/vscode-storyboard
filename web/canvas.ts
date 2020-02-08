/*
const x = {
    "graph": "Textured Quad",
    "type": "Material",
    "inputs": [
        {
            "name": "pos"
        },
        {
            "name": "ambient_light"
        },
        {
            "name": "ambient_light"
        }
    ]
}
*/

// TODO: Taken from old elm codebase, not yet adapted

const nodeRefId = (nodeRef: string) => 'node-ref-' + nodeRef;

const nodeSocketRect = (nodeRef: string, socket: string) => {
    const id = nodeRefId(nodeRef);
    const e = document.getElementById(id);
    if (!e) {
        return null;
    }
    const sElement = e.querySelector(
        `.node-io-item[data-socket="${socket}"] > .node-socket`
    );
    return sElement && sElement.getBoundingClientRect();
};

const resizeCanvas = (canvas: HTMLCanvasElement | null, state: { ctx: any; connections: any[]; floatingWire: null; translation: { x: number; y: number; }; scale: number; }) => () => {
    if (!canvas) {
        return;
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    redraw(state);
};

const initializeCanvas = (id: string, canvasMouseDownPort: { send: (arg0: number[]) => void; }, scrollAmountPort: { send: (arg0: number) => void; }) => {
    const canvas = document.getElementById(id);
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        return null;
    }
    const ctx = canvas.getContext('2d');

    const connections: never[] = [];
    const floatingWire = null;
    const translation = { x: 0, y: 0 };
    const scale = 1.0;
    const state = { ctx, connections, floatingWire, translation, scale };

    const resizeCb = resizeCanvas(canvas, state);
    window.addEventListener('resize', resizeCb);
    resizeCb();

    canvas.addEventListener('mousedown', (e) => {
        canvasMouseDownPort.send([e.clientX, e.clientY]);
    });

    window.addEventListener('wheel', (e) => {
        scrollAmountPort.send(e.deltaY);
    });

    return state;
};

const updateConnections = (state: { connections: any; floatingWire: any; translation: any; scale: any; }, connections: any, floatingWire: any, translation: any, scale: any) => {
    state.connections = connections;
    state.floatingWire = floatingWire;
    state.translation = translation;
    state.scale = scale;
};

const drawGrid = (ctx: CanvasRenderingContext2D, translation: { x: number; y: number; }, scale: number) => {
    const strokeStyle = "rgb(124, 109, 96)";
    // width of major and minor lines
    const majorWidth = 1.0;
    const minorWidth = 0.5;
    // grid spacing in pixels between minor increments
    const gridSpacing = 25;
    // the nth grid line will be a major line
    const majorFrequency = 4;

    ctx.save();

    ctx.strokeStyle = strokeStyle;
    ctx.scale(scale, scale);
    ctx.translate(-translation.x, -translation.y);

    const leftEdge = translation.x;
    const topEdge = translation.y;
    const rightEdge = translation.x + window.innerWidth / scale;
    const bottomEdge = translation.y + window.innerHeight / scale;

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
const drawGridLines = (ctx: CanvasRenderingContext2D, isVert: boolean, bounds: { start: any; end: any; }, crossBounds: { start: any; end: any; }, spacing: number, majorFreq: number, widths: { major: any; minor: any; }) => {
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

interface GraphCanvasState {
    ctx: any;
    connections: Array<{start: [string, string], end: [string, string]}>;
    floatingWire: any;
    translation: any;
    scale: any;
}

const redraw = (state: GraphCanvasState) => {
    requestAnimationFrame(() => {
        const { ctx, connections, floatingWire, translation, scale } = state;
        const resolved = connections.map(({ start: [start, output], end: [end, input]}) => {
            const first = nodeSocketRect(start, output);
            const second = nodeSocketRect(end, input);
            if (!first || !second) {
                return { start: null, end: null };
            }
            return {
                start: { x: first.right, y: (first.top + first.bottom) / 2.0 },
                end: { x: second.left, y: (second.top + second.bottom) / 2.0 },
            };
        });

        ctx.save();

        // TODO: everything will need to handle DPI and transformations
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        drawGrid(ctx, translation, scale);

        for (const { start, end } of resolved) {
            if (start === null || end === null) {
                continue;
            }

            const flair = 100 * scale;
            const cp1 = { x: start.x + flair, y: start.y };
            const cp2 = { x: end.x - flair, y: end.y };

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);

            ctx.strokeStyle = "rgb(209, 101, 39)";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        if (floatingWire !== null) {
            const { source: [node, socket], isByHead, mousePos } = floatingWire;
            const rect = nodeSocketRect(node, socket);
            if (rect !== null) {
                const y = (rect.top + rect.bottom) / 2.0;
                // if isByHead, then we are dragging from an input, else from an output
                const origin = isByHead ? { x: rect.right, y } : { x: rect.left, y };

                const flipFactor = isByHead ? 1 : -1;
                const start = origin;
                const end = mousePos;

                const flair = 100 * scale;
                const cp1 = { x: start.x + flair * flipFactor, y: start.y };
                const cp2 = { x: end.x - flair * flipFactor, y: end.y };

                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);

                ctx.strokeStyle = "rgb(209, 101, 39)";
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        ctx.restore();
    });
};

module.exports = {
    initializeCanvas,
    redraw,
};
