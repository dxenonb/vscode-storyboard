type BoardState = Idle | DraggingNode | EditingHeader;

type Idle = { kind: 'idle' };

interface DraggingNode {
    kind: 'draggingNode';
    ref: NodeRef;
    start: Vec2d;
}

interface EditingHeader {
    kind: 'editingHeader';
    ref: NodeRef;
}

type BoardMessageReceiver = { send: (msg: BoardMessage) => void };

type BoardMessage
    = SelectHeader
    | DblClickHeader
    | UpdateHeader
    | UpdateContent
    | SelectCanvas
    | MouseUpHeader;

enum BoardMessageKind {
    SelectHeader = 'SelectHeader',
    DblClickHeader = 'DblClickHeader',
    UpdateHeader = 'UpdateHeader',
    UpdateContent = 'UpdateContent',
    SelectCanvas = 'SelectCanvas',
    MouseUpHeader = 'MouseUpHeader',
    Drag = 'Drag',
}

type _Ne<K> = { kind: K, node: NodeRef };

type SelectHeader = _Ne<'SelectHeader'>
    & { pos: Vec2d };

type DblClickHeader = _Ne<'DblClickHeader'>;

type UpdateHeader = _Ne<'UpdateHeader'>
    & { content: string };

type UpdateContent = _Ne<'UpdateContent'>
    & { content: string };

type SelectCanvas = { kind: 'SelectCanvas' };

type MouseUpHeader = _Ne<'MouseUpHeader'>;
