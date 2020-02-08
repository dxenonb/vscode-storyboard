const send = () => { };

const state = initializeCanvas('graph', { send }, { send });

if (state) {
    redraw(state);
}
