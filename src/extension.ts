import * as vscode from 'vscode';
import * as path from 'path';

interface BoardViewResources {
	scriptMain: vscode.Uri,
	scriptCanvas: vscode.Uri,
	style: vscode.Uri,
}

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('extension.sequenceGraph.openBoard', () => {
		const extensionPath = context.extensionPath;
		const panel = vscode.window.createWebviewPanel(
			'sequencegraph',
			'example (Seq)',
			vscode.ViewColumn.Active,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))],
			},
		);

		const mediaUri = (mediaPath: string[]) => {
			const paths = [extensionPath, 'media', ...mediaPath];
			const uri = vscode.Uri.file(path.join.apply(path, paths));
			return panel.webview.asWebviewUri(uri);
		};

		const paths = {
			scriptMain: mediaUri(['main.js']),
			scriptCanvas: mediaUri(['canvas.js']),
			style: mediaUri(['styles', 'board.css']),
		};

		panel.webview.html = getWebviewContent(panel.webview, paths);

		panel.onDidDispose(() => {
			console.log('disposed!');
		});
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}

function getWebviewContent(webview: vscode.Webview, paths: BoardViewResources) {
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
			<canvas width="800" height="600" id="graph"></canvas>
			<script src="${paths.scriptCanvas}"></script>
			<script src="${paths.scriptMain}"></script>
		</body>
		</html>
	`;
}
