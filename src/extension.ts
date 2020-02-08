import * as vscode from 'vscode';
import * as path from 'path';

interface BoardViewResources {
	script: vscode.Uri,
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

		const paths = {
			script: panel.webview.asWebviewUri(vscode.Uri.file(
				path.join(extensionPath, 'media', 'main.js'),
			)),
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
			<title>Sequence Graph Board</title>
		</head>
		<body>
			<p>It begins!</p>
			<script src="${paths.script}">
		</body>
		</html>
	`;
}
