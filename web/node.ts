function initNode(id: string) {
    const root = document.createElement('div');
    root.id = id;
    root.className = 'node-root';

    const leftSocket = document.createElement('div');
    leftSocket.className = 'node-socket';

    const colorBar = document.createElement('div');
    colorBar.className = 'node-color-bar';

    const header = document.createElement('input');
    header.className = 'node-header';
    header.disabled = true;

    const content = document.createElement('textarea');
    content.className = 'node-content';

    const rightSocket = document.createElement('div');
    rightSocket.className = 'node-socket';

    root.appendChild(leftSocket);
    root.appendChild(colorBar);
    root.appendChild(header);
    root.appendChild(content);
    root.appendChild(rightSocket);

    return root;
}

function updateNodeContent(el: HTMLElement, header: string, content: string) {
    const ie = el.querySelector('.node-header');
    if (ie instanceof HTMLInputElement) {
        ie.value = header;
    }
    const ta = el.querySelector('.node-content');
    if (ta && ta instanceof HTMLTextAreaElement) {
        ta.value = content;
    }
}

function updateNodeColor(el: HTMLElement, color: string) {
    el.querySelector('.node-color-bar')!.setAttribute(
        'style',
        `background-color: ${color}`,
    );
}

function updateNodePosition(el: HTMLElement, x: number, y: number, scale: number) {
    const newStyle = `transform: translate(${x}, ${y}) scale(${scale})`;
    el.querySelector('.node-root')!.setAttribute('style', newStyle);
}

function updateNodeRef(el: HTMLElement, ref: NodeRef) {
    el.setAttribute('data-node-ref', ref);
}

function nodeRefFromElement(el: HTMLElement): string | null {
    if (el.matches('.node-root')) {
        return el.getAttribute('data-node-ref');
    }
    if (el.className.indexOf('node-') === -1 || !el.parentElement) {
        return null;
    }
    return nodeRefFromElement(el.parentElement);
}
