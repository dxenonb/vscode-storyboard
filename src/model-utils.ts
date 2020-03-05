// This module is separate from the types so the frontend can depend on the
// import-less shared.d.ts (which only pulls in the types)

import { BoardGraph, Vec2d, BoardNode, NodeRef } from "./model-types";

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

    content.nodes = content.nodes.reduce(
        (nodes: Map<NodeRef, BoardNode<Vec2d>>, node: BoardNode<Vec2d>) => {
            nodes.set(node.ref, node);
            return nodes;
        },
        new Map(),
    );

    // TODO: update this for Map type... it's late
    
    // const nodes = content.nodes;
    // for (const ref of Object.keys(nodes)) {
    //     const node = nodes[ref];
    //     if (!isNode(node)) {
    //         return null;
    //     }
    // }

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
