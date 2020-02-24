import * as vscode from 'vscode';
import ExtensionState from './extState';
import CommandDispatcher from './commands';

export function activate(context: vscode.ExtensionContext) {
	const extension = new ExtensionState(context);
	const commands = new CommandDispatcher(extension);

	context.subscriptions.push(
		extension,
		commands,
	);
}

export function deactivate() {}
