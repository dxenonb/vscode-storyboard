import { WebviewPanel, Uri, Webview } from "vscode";
import { BoardGraph, Vec2d } from "./model-types";
import { SeqGraphMessage, UpdateTitle } from "./messages";

export type EditorViewResources = { [key: string]: Uri };

const HANDLERS_BY_COMMAND: { [command: string]: string | undefined } = [
    'UpdateTitle',
].reduce(
    (sum, command) => Object.assign(sum, { [command]: `handleMessage${command}` }),
    {},
);

export class EditorView {

    private panel: WebviewPanel;
    private resources: EditorViewResources;

    public constructor(
        panel: WebviewPanel,
        resources: EditorViewResources,
    ) {
        this.panel = panel;

        this.resources = {};
        Object.keys(resources).reduce((sum: EditorViewResources, cur) => {
            sum[cur] = panel.webview.asWebviewUri(resources[cur]);
            return sum;
        }, this.resources);

        panel.webview.html = getWebviewContent(panel.webview, this.resources);

        panel.webview.onDidReceiveMessage(
            (message) => this.handleWebviewMessage(message)
        );

        panel.onDidDispose(() => this.handleDispose());
    }

    public loadBoard(fsPath: string, content: BoardGraph<Vec2d>) {
        // We may need to defer this based on webview visibility if we have
        // subtle issues (e.g. messages not being received)
        this.sendWebview({
            command: 'UpdateGraph',
            nodes: Object.values(content.nodes),
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
            (this as any)[handler](message);
        } else {
            // TODO: Log that the webview sent an unknown message
            console.error('Received unknown message from webview:', message);
        }
    }

    private handleMessageUpdateTitle(message: UpdateTitle) {
        this.panel.title = message.title;
    }

    private sendWebview(message: SeqGraphMessage): Thenable<boolean> {
        return this.panel.webview.postMessage(message);
    }

    private handleDispose() {

    }
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
