// States

type BoardState
    = Idle
    | DraggingWire
    | DraggingNode
    | EditingHeader;

type Idle = { kind: 'idle', selected: NodeRef[] };

type DraggingWire = { kind: 'draggingWire' } & FloatingWire;

interface DraggingNode {
    kind: 'draggingNode';
    ref: NodeRef;
    start: Vec2d;
}

interface EditingHeader {
    kind: 'editingHeader';
    ref: NodeRef;
}

// Messages

type BoardMessageReceiver = { send: (msg: BoardMessage) => void };

type BoardMessage
    = SelectSocket
    | SelectHeader
    | DblClickHeader
    | UpdateHeader
    | UpdateContent
    | SelectCanvas
    | MouseUpCanvas
    | MouseUpSocket
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

type SelectSocket = _Ne<'SelectSocket'>
    & { mousePos: Vec2d, isByHead: boolean };

type SelectHeader = _Ne<'SelectHeader'>
    & { pos: Vec2d };

type DblClickHeader = _Ne<'DblClickHeader'>;

type UpdateHeader = _Ne<'UpdateHeader'>
    & { content: string };

type UpdateContent = _Ne<'UpdateContent'>
    & { content: string };

type SelectCanvas = { kind: 'SelectCanvas' };

type MouseUpCanvas = { kind: 'MouseUpCanvas', mousePos: Vec2d };

type MouseUpSocket = _Ne<'MouseUpSocket'>
    & { socket: 'left' | 'right' };

type MouseUpHeader = _Ne<'MouseUpHeader'>;
