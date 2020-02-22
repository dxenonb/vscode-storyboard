type BoardState = Idle | DraggingNode | EditingHeader | EditingContent;

type Idle = { kind: 'idle' };

interface DraggingNode {
    kind: 'draggingNode';
}

interface EditingHeader {
    kind: 'editingHeader';
    ref: NodeRef;
    input: HTMLInputElement;
}

interface EditingContent {
    kind: 'editingContent';
    ref: NodeRef;
    input: HTMLTextAreaElement;
}
