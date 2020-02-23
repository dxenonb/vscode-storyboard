type BoardState = Idle | DraggingNode | EditingHeader;

type Idle = { kind: 'idle' };

interface DraggingNode {
    kind: 'draggingNode';
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
    | Drag;

enum BoardMessageKind {
    SelectHeader = 'SelectHeader',
    DblClickHeader = 'DblClickHeader',
    UpdateHeader = 'UpdateHeader',
    UpdateContent = 'UpdateContent',
    SelectCanvas = 'SelectCanvas',
    Drag = 'Drag',
}

type _Ne<K> = { kind: K, node: NodeRef };

type SelectHeader = _Ne<'SelectHeader'>;

type DblClickHeader = _Ne<'DblClickHeader'>;

type UpdateHeader = _Ne<'UpdateHeader'>
    & { content: string };

type UpdateContent = _Ne<'UpdateContent'>
    & { content: string };

type SelectCanvas = { kind: 'SelectCanvas' };

type Drag = { kind: 'Drag', delta: Vec2d, newPos: Vec2d };
