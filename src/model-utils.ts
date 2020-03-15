// This module is separate from the types so the frontend can depend on the
// import-less shared.d.ts (which only pulls in the types)

import { BoardGraph, Vec2d, BoardNode, NodeRef, BoardEdge } from "./model-types";

export function edgeKey(edge: BoardEdge) {
    return `${edge.start}-${edge.end}`;
}

export function parseBoardJson(text: string): BoardGraph<Vec2d> | string {
    let content: any;
    try {
        content = JSON.parse(text);
    } catch {
        return 'invalid JSON';
    }

    if (!content) {
        return 'JSON is null';
    } else if (!content.nodes) {
        return 'nodes are missing';
    } else if (!content.edges) {
        return 'edges are missing';
    }

    const board: BoardGraph<Vec2d> = {
        nodes: new Map(),
        edges: new Map(),
    };

    try {
        const nodes = content.nodes;
        for (const node of nodes) {
            const ref = node.ref;
            if (!isNode(node)) {
                return `JSON contained invalid node with ID ${ref}`;
            }
            board.nodes.set(ref, node);
        }

        const edges = content.edges;
        for (const edge of edges) {
            if (!isEdge(edge)) {
                return `JSON contained invalid edge: ${JSON.stringify(edge)}`;
            }
            const key = edgeKey(edge);
            board.edges.set(key, edge);
        }
    } catch (e) {
        return `encountered an exception while parsing JSON: ${e}`;
    }

    return board;
}

export function serializeJson(board: BoardGraph<Vec2d>): string {
    return JSON.stringify(board, jsonReplacer, 2);
}

function jsonReplacer(key: string, value: any) {
    if (key === 'nodes' && value instanceof Map) {
        return Array.from(value.values());
    }
    if (key === 'edges' && value instanceof Map) {
        return Array.from(value.values());
    }
    return value;
}

export function isNode(node: any): node is BoardNode<Vec2d> {
    return node
        && node.ref
        && isVec2d(node.pos)
        && (typeof node.color === 'string' || node.color === null)
        && (isVec2d(node.size) || node.size === null)
        && typeof node.header === 'string' && typeof node.content === 'string';
}

export function isEdge(edge: any): edge is BoardEdge {
    return edge
        && typeof edge.start === 'string'
        && typeof edge.end === 'string';
}

export function isVec2d(vec: any): vec is Vec2d {
    return vec
        && typeof vec.x === 'number'
        && typeof vec.y === 'number';
}
