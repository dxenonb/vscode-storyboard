import * as vscode from 'vscode';
import SequenceGraph from './sequence-graph';

export function activate(context: vscode.ExtensionContext) {
	const extension = new SequenceGraph(context);
	context.subscriptions.push(extension);
}

export function deactivate() {}
