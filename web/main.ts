const send = () => { };

const nodeHost = document.getElementById('node-host');
const state = initializeCanvas('graph', { send }, { send });

if (state) {
    redraw(state);

    const el = createNode(nodeRefId('1'));
    if (el && nodeHost) {
        nodeHost.appendChild(el);
        updateNode(el, { header: 'Hello world!' });
    }
}
