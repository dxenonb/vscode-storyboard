import * as vscode from "vscode";
import { WebviewPanel, Uri, Webview } from "vscode";
import { BoardGraph, Vec2d } from "./model-types";
import { SeqGraphMessage, UpdateTitle, UpdateGraph } from "./messages";
import { promises as fs } from "fs";
import LABELS from "./labels";

export type EditorViewResources = { [key: string]: Uri };

const HANDLERS_BY_COMMAND: { [command: string]: string | undefined } = [
    'UpdateTitle',
    'UpdateGraph',
    'EditorViewReady',
].reduce(
    (sum, command) => Object.assign(sum, { [command]: `handleMessage${command}` }),
    {},
);

const AUTOSAVE_MS = 3000;
const MAX_AUTOSAVE_MS = 10000;

export class EditorView {
    private panel: WebviewPanel;
    private resources: EditorViewResources;

    private fsPath: string | null;
    private graph: BoardGraph<Vec2d>;
    private autosaveTimeout: NodeJS.Timeout | null;
    private maxAutosaveTimeout: NodeJS.Timeout | null;

    private saveCount: number;
    private wasVisible: boolean;

    public constructor(
        panel: WebviewPanel,
        resources: EditorViewResources,
    ) {
        this.panel = panel;

        this.graph = { nodes: new Map(), edges: [] };
        this.autosaveTimeout = null;
        this.maxAutosaveTimeout = null;
        this.fsPath = null;
        this.saveCount = 0;
        this.wasVisible = true;

        this.resources = {};
        Object.keys(resources).reduce((sum: EditorViewResources, cur) => {
            sum[cur] = panel.webview.asWebviewUri(resources[cur]);
            return sum;
        }, this.resources);

        panel.webview.html = getWebviewContent(panel.webview, this.resources);

        panel.webview.onDidReceiveMessage(
            (message) => this.handleWebviewMessage(message)
        );

        panel.onDidChangeViewState(
            (event) => this.handleDidChangeViewState(event)
        );

        panel.onDidDispose(() => this.handleDispose());
    }

    public loadBoard(fsPath: string, graph: BoardGraph<Vec2d>) {
        // We may need to defer this based on webview visibility if we have
        // subtle issues (e.g. messages not being received)
        this.graph = graph;
        this.fsPath = fsPath;
        this.sendWebview({
            command: 'UpdateGraph',
            nodes: Array.from(graph.nodes.values()),
        });
        this.sendWebview({
            command: 'UpdateFilePath',
            fsPath,
        });
    }

    private handleWebviewMessage(message: SeqGraphMessage) {
        const command = message.command;
        const handler = HANDLERS_BY_COMMAND[command];
        if (handler) {
            try {
                (this as any)[handler](message);
            } catch (e) {
                console.error('got exception while handling message:', e);
            }
        } else {
            // TODO: Log that the webview sent an unknown message
            console.error('Received unknown message from webview:', message);
        }
    }

    private handleMessageUpdateGraph(message: UpdateGraph) {
        for (const node of message.nodes) {
            this.graph.nodes.set(node.ref, node);
        }
        this.recordChange();
    }

    private handleMessageUpdateTitle(message: UpdateTitle) {
        this.panel.title = message.title;
    }

    private handleDidChangeViewState(
        event: vscode.WebviewPanelOnDidChangeViewStateEvent
    ): any {
        const visible = event.webviewPanel.visible;
        if (!this.wasVisible && visible) {
            this.sendWebview({
                command: 'UpdateGraph',
                nodes: Array.from(this.graph.nodes.values()),
            });
        }
        this.wasVisible = visible;
    }

    private sendWebview(message: SeqGraphMessage): void {
        this.panel.webview.postMessage(message);
        return;
    }

    private recordChange() {
        if (!this.fsPath) {
            return;
        }

        // defer autosave until the user stops making changes
        if (this.autosaveTimeout !== null) {
            clearTimeout(this.autosaveTimeout);
        }
        this.autosaveTimeout = setTimeout(() => {
            this.save();
        }, AUTOSAVE_MS);

        // make sure there is a max autosave timeout
        if (this.maxAutosaveTimeout === null) {
            this.maxAutosaveTimeout = setTimeout(() => {
                this.save();
            }, MAX_AUTOSAVE_MS);
        }
    }

    private async save(): Promise<void> {

        this.saveCount += 1;
        console.log('Save count:', this.saveCount);

        // cancel save timers
        if (this.autosaveTimeout !== null) {
            clearTimeout(this.autosaveTimeout);
            this.autosaveTimeout = null;
        }
        if (this.maxAutosaveTimeout !== null) {
            clearTimeout(this.maxAutosaveTimeout);
            this.maxAutosaveTimeout = null;
        }

        if (this.fsPath) {
            const data = JSON.stringify(this.graph, jsonReplacer);
            fs.writeFile(this.fsPath, data, { encoding: 'utf-8' });
            return;
        }

        const filters = {
            'Board': ['.sequencegraph', '.seqgraph', '.board', '.json'],
        };
        vscode.window.showSaveDialog({ filters })
            .then((path) => {
                if (!path) {
                    return;
                } else if (path.scheme !== 'file') {
                    vscode.window.showErrorMessage(LABELS.onlyLocalFsSupported);
                    return;
                }
                this.fsPath = path.fsPath;
                this.save();
            });
    }

    private handleDispose() {
        if (this.fsPath) {
            this.save();
        }
    }
}

function jsonReplacer(key: string, value: any) {
    if (key === 'nodes' && value instanceof Map) {
        return Array.from(value.values());
    }
    return value;
}

// TODO: Don't use unsafe-inline for styles

function getWebviewContent(webview: Webview, paths: EditorViewResources) {
	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta
				http-equiv="Content-Security-Policy"
				content="
					default-src 'none';
					script-src ${webview.cspSource};
					style-src 'unsafe-inline' ${webview.cspSource};
				"
			/>
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<link rel="stylesheet" type="text/css" href="${paths.style}">
			<title>Sequence Graph Board</title>
		</head>
		<body>
            <canvas width="400" height="400" id="graph"></canvas>
            <div id="node-host"></div>
            <script src="${paths.scriptVec2d}"></script>
            <script src="${paths.scriptContextMenu}"></script>
            <script src="${paths.scriptCanvas}"></script>
            <script src="${paths.scriptNode}"></script>
			<script src="${paths.scriptMain}"></script>
		</body>
		</html>
	`;
}
