import { WebviewPanel, Uri, Webview } from "vscode";
import { BoardGraph, Vec2d } from "./model";
import { SeqGraphMessage } from "./messages";

export type EditorViewResources = { [key: string]: Uri };

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

        panel.onDidDispose(() => this.handleDispose());
    }

    public loadBoard(content: BoardGraph<Vec2d>) {
        const message: SeqGraphMessage = {
            command: 'UpdateGraph',
            nodes: Object.values(content.nodes),
        };
        this.panel.webview.postMessage(message);
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
