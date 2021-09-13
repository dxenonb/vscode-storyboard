import * as vscode from 'vscode';
import { Vec2d } from './model-types';
import { StoryBoard } from './storyBoard';

export default class StoryBoardEditor<V extends Vec2d> {
	constructor(
		private webviewPanel: vscode.WebviewPanel,
		private handler: StoryBoardStorageProvider<V>,
	) {
		// Setup initial content for the webview
		webviewPanel.webview.options = {
			enableScripts: true,
		};
		webviewPanel.webview.html = getHtmlForWebview(webviewPanel.webview);

		webviewPanel.webview.onDidReceiveMessage((e) => {
			switch (e.type) {
				case 'update':
					this.handler.update(e);
					return;
			}
		});
	}

	readBoard(board: StoryBoard<V>) {
		this.webviewPanel.webview.postMessage({
			type: 'readBoard',
			board,
		});
	}
}

export interface StoryBoardStorageProvider<V extends Vec2d> {
	update(board: StoryBoard<V>): void;
}


function getHtmlForWebview(webview: vscode.Webview) {
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
			<!-- <link rel="stylesheet" type="text/css" href="{paths.style}"> -->
			<title>Story Board</title>
		</head>
		<body>
            <canvas width="400" height="400" id="graph"></canvas>
            <div id="node-host"></div>
			<p>Hello world!</p>
		</body>
		</html>
	`;
}
