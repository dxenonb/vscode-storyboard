import { WebviewPanel, Uri, Webview } from "vscode";

export interface BoardViewResources {
	scriptMain: Uri,
    scriptCanvas: Uri,
    scriptNode: Uri,
	style: Uri,
}

export class BoardEditor {

    private panel: WebviewPanel;
    private resources: BoardViewResources;

    public constructor(
        panel: WebviewPanel,
        { scriptMain, scriptCanvas, scriptNode, style }: BoardViewResources,
    ) {
        this.panel = panel;

        this.resources = {
            scriptMain: panel.webview.asWebviewUri(scriptMain),
            scriptCanvas: panel.webview.asWebviewUri(scriptCanvas),
            style: panel.webview.asWebviewUri(style),
            scriptNode: panel.webview.asWebviewUri(scriptNode),
        };

        panel.webview.html = getWebviewContent(panel.webview, this.resources);

        panel.onDidDispose(() => this.handleDispose());
    }

    public loadBoard(content: any) {
        console.log('got content', content);
    }

    private handleDispose() {

    }
}

function getWebviewContent(webview: Webview, paths: BoardViewResources) {
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
					style-src ${webview.cspSource};
				"
			/>
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<link rel="stylesheet" type="text/css" href="${paths.style}">
			<title>Sequence Graph Board</title>
		</head>
		<body>
            <canvas width="400" height="400" id="graph"></canvas>
            <div id="node-host"></div>
            <script src="${paths.scriptCanvas}"></script>
            <script src="${paths.scriptNode}"></script>
			<script src="${paths.scriptMain}"></script>
		</body>
		</html>
	`;
}