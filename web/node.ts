function createNode(id: string) {
    const root = document.createElement('div');
    root.id = id;
    root.className = 'node-root';

    const leftSocket = document.createElement('div');
    leftSocket.className = 'node-socket';

    const colorBar = document.createElement('div');
    colorBar.className = 'node-color-bar';

    const header = document.createElement('p');
    header.className = 'node-header';

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

interface NodeUpdateOptions { header?: string, content?: string }

function updateNode(el: HTMLElement, { header, content }: NodeUpdateOptions ) {
    if (header) {
        el.querySelector('.node-header')!.textContent = header;
    }
    if (content) {
        const ta = el.querySelector('.node-content');
        if (ta && ta instanceof HTMLTextAreaElement) {
            ta.value = content;
        }
    }
}
