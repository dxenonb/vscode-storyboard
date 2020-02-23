import * as vscode from 'vscode';
import ExtensionState from './extState';

export function activate(context: vscode.ExtensionContext) {
	const extension = new ExtensionState(context);
	context.subscriptions.push(extension);
}

export function deactivate() {}
