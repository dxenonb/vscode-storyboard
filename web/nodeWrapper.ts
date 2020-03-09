class RawNodeWrapper {

    public header: string;
    public content: string;
    public position: Vec2d;

    private host: HTMLElement;
    private rx: BoardMessageReceiver;
    private attached: boolean;
    private node: HTMLElement;

    constructor(host: HTMLElement, rx: BoardMessageReceiver) {
        this.host = host;
        this.rx = rx;
        this.attached = false;
        this.node = _initNode(rx);

        this.header = '';
        this.content = '';
        this.position = new Vec2d(0, 0);
    }

    unlockHeader() {
        const header = this.node.querySelector('.node-header');
        if (header instanceof HTMLInputElement) {
            header.disabled = false;
            header.focus();
        }
    }

    lockHeader() {
        const header = this.node.querySelector('.node-header');
        if (header instanceof HTMLInputElement) {
            header.disabled = true;
        }
    }

    render() {
        _updateNodeContent(this.node, this.header, this.content);
        const { x, y } = this.position;
        _updateNodePosition(this.node, x, y, 1.0);
    }

    attach(node: BoardNode) {
        if (this.attached) {
            throw new Error('Node is already attached!');
        }

        this.content = node.content;
        this.header = node.header;
        this.position = node.pos;
        _updateNodeRef(this.node, node.ref);

        this.host.appendChild(this.node);
        this.attached = true;

        this.render();
    }

    detach() {
        if (!this.attached) {
            throw new Error('Node is already detached!');
        }
        this.host.removeChild(this.node);
        this.attached = false;
        _updateNodeRef(this.node, '');
    }
}

function _initNode(rx: BoardMessageReceiver): HTMLElement {
    type Handler<E extends Event> = (ref: NodeRef, event: E) => BoardMessage | null;
    const withNodeRef = <E extends Event>(f: Handler<E>) => (event: E) => {
        const ref = nodeRefFromElement(event.target);
        if (!ref) {
            return;
        }
        const result = f(ref, event);
        if (result) {
            rx.send(result);
        }
        return result;
    };

    const root = document.createElement('div');
    root.className = 'node-root';

    // disabled elements don't fire events but the events do bubble
    // so we listen for the header events on the root
    root.addEventListener('dblclick', withNodeRef((node, event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return null;
        }
        if (!target.matches('.node-header')) {
            return null;
        }
        return { kind: 'DblClickHeader', node };
    }));
    root.addEventListener('mousedown', withNodeRef((node, event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return null;
        }
        if (!target.matches('.node-header')) {
            return null;
        }
        event.stopPropagation();
        const pos = new Vec2d(event.x, event.y);
        return { kind: 'SelectHeader', node, pos };
    }));
    root.addEventListener('mouseup', withNodeRef((node, event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return null;
        }
        if (!target.matches('.node-header')) {
            return null;
        }
        return { kind: 'MouseUpHeader', node };
    }));

    const leftSocket = document.createElement('div');
    leftSocket.className = 'node-socket';
    leftSocket.addEventListener('mousedown', withNodeRef((node, event) => {
        const mousePos = new Vec2d(event.x, event.y);
        return { kind: 'SelectSocket', node, mousePos, isByHead: false };
    }));

    const colorBar = document.createElement('div');
    colorBar.className = 'node-color-bar';

    const header = document.createElement('input');
    header.className = 'node-header';
    header.disabled = true;
    header.addEventListener('input', withNodeRef((node) =>
        ({ kind: 'UpdateHeader', node, content: header.value })
    ));

    const content = document.createElement('textarea');
    content.className = 'node-content';
    content.addEventListener('input', withNodeRef((node) =>
        ({ kind: 'UpdateContent', node, content: content.value })
    ));

    const rightSocket = document.createElement('div');
    rightSocket.className = 'node-socket';
    rightSocket.addEventListener('mousedown', withNodeRef((node, event) => {
        const mousePos = new Vec2d(event.x, event.y);
        return { kind: 'SelectSocket', node, mousePos, isByHead: true };
    }));

    root.appendChild(leftSocket);
    root.appendChild(colorBar);
    root.appendChild(header);
    root.appendChild(content);
    root.appendChild(rightSocket);

    return root;
}

function _updateNodeContent(el: HTMLElement, header: string, content: string) {
    const ie = el.querySelector('.node-header');
    if (ie instanceof HTMLInputElement) {
        ie.value = header;
    }
    const ta = el.querySelector('.node-content');
    if (ta && ta instanceof HTMLTextAreaElement) {
        ta.value = content;
    }
}

function _updateNodeColor(el: HTMLElement, color: string) {
    el.querySelector('.node-color-bar')!.setAttribute(
        'style',
        `background-color: ${color}`,
    );
}

function _updateNodePosition(el: HTMLElement, x: number, y: number, scale: number) {
    if (!el.matches('.node-root')) {
        throw new Error('Call _updateNodePosition on root nodes only');
    }
    const newStyle = `transform: translate(${x}px, ${y}px) scale(${scale})`;
    el.setAttribute('style', newStyle);
}

function _updateNodeRef(el: HTMLElement, ref: NodeRef) {
    el.setAttribute('data-node-ref', ref);
    // the graph renderer/canvas code still uses get-by-id... not high priority
    // to refactor but probably not ideal.
    el.id = nodeRefId(ref);
}

function nodeRefFromElement(el: EventTarget | null): string | null {
    if (!el || !(el instanceof HTMLElement)) {
        return null;
    }
    if (el.matches('.node-root')) {
        return el.getAttribute('data-node-ref');
    }
    if (el.className.indexOf('node-') === -1 || !el.parentElement) {
        return null;
    }
    return nodeRefFromElement(el.parentElement);
}
