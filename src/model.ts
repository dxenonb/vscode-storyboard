export type NodeRef = string;

export interface BoardGraph<V extends Vec2d> {
    nodes: Map<NodeRef, BoardNode<V>>;
    edges: Array<{ start: NodeRef, end: NodeRef }>;
}

export interface BoardNode<V extends Vec2d> {
    ref: NodeRef;
    pos: V;
    color: string | null;
    size: V | null;

    header: string;
    content: string;
}

export type Vec2d = { x: number, y: number };

export function parseBoardJson(text: string): BoardGraph<Vec2d> | null {
    let content: any;
    try {
        content = JSON.parse(text);
    } catch {
        return null;
    }

    if (!content || !content.nodes) {
        return null;
    }

    const nodes = content.nodes;
    for (const ref of Object.keys(nodes)) {
        const node = nodes[ref];
        if (!isNode(node)) {
            return null;
        }
    }

    return content as BoardGraph<Vec2d>;
}

export function isNode(node: any): node is BoardNode<Vec2d> {
    return true
        && node.ref
        && node.pos && node.pos.x && node.pos.y
        && (node.color || node.color === null)
        && ((node.size && node.size.x && node.size.y) || node.size === null)
        && typeof node.header === 'string' && typeof node.content === 'string';
}
