import * as vscode from 'vscode';
import StoryBoardEditorProvider from './customEditor';
import ExtensionState from './extState';
import CommandDispatcher from './commands';

export function activate(context: vscode.ExtensionContext) {
	const extension = new ExtensionState(context);
	const editor = StoryBoardEditorProvider.register(context);
	const commands = new CommandDispatcher(extension);

	context.subscriptions.push(
		editor,
		extension,
		commands,
	);
}

export function deactivate() {}
