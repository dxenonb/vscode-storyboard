import * as vscode from "vscode";
import { ExtensionContext, Uri, Disposable, TextEditor } from "vscode";

import * as path from 'path';
import * as fs from 'fs';

import { BoardEditor, BoardViewResources } from "./board-editor";
import Commands from "./commands";

const BOARD_WEBVIEW_ID = 'sequenceGraph.boardEditor';

export default class SequenceGraph implements Disposable {

    private editors: BoardEditor[];
    private editorsByFile: { [path: string]: BoardEditor };
    private context: ExtensionContext;
    private resources: BoardViewResources;
    private localResourceRoots: Uri[];
    private disposables: Disposable[];

    public constructor(context: ExtensionContext) {
        this.context = context;
        this.editors = [];
        this.editorsByFile = {};

        this.resources = {
            scriptMain: this.mediaUri(['main.js']),
            scriptCanvas: this.mediaUri(['canvas.js']),
            style: this.mediaUri(['styles', 'board.css']),
        };

        this.localResourceRoots = [Uri.file(path.join(context.extensionPath, 'media'))];

        this.disposables = [];
        this.registerCommands();
        this.registerListeners();
    }

    private async createBoardEditor() {
		const panel = vscode.window.createWebviewPanel(
			BOARD_WEBVIEW_ID,
			'new board',
			vscode.ViewColumn.Active,
			{
				enableScripts: true,
				localResourceRoots: this.localResourceRoots,
			},
		);

        const editor = new BoardEditor(panel, this.resources);

        return editor;
    }

    private async openBoardEditor(uri: Uri) {
        if (uri.scheme !== 'file') {
            vscode.window.showErrorMessage('Only local files are supported');
            return null;
        }
        const path = uri.fsPath;
        let content;
        try {
            content = await fs.promises.readFile(path, { encoding: 'utf-8' });
        } catch {
            const message = 'Failed to open board from JSON file.';
            vscode.window.showErrorMessage(message);
            return null;
        }
        let document;
        try {
            document = parseBoardJson(content);
        } catch {
            return null;
        }
        const board = await this.createBoardEditor();
        board.loadBoard(document);
        return board;
    }

    private registerCommands() {
        this.disposables.push(
            vscode.commands.registerCommand(Commands.CreateBoard, () => {
                this.createBoardEditor();
            }),
            vscode.commands.registerTextEditorCommand(Commands.OpenBoard, (editor) => {
                this.openBoardEditor(editor.document.uri);
            }),
        );
    }

    private registerListeners() {
        this.disposables.push(
            vscode.workspace.onDidOpenTextDocument((document) => {
                const uri = document.uri;
                const path = document.uri.fsPath;
                if (uri.scheme === 'file' && path.endsWith('.seqgraph.json')) {
                    const message = 'Open this file in the board editor?';
                    vscode.window.showInformationMessage(message, 'Open')
                        .then((action) => {
                            if (action === 'Open') {
                                return this.openBoardEditor(uri);
                            }
                            return Promise.resolve(null);
                        });
                }
            })
        );
    }

    private mediaUri(mediaPath: string[]) {
        const extensionPath = this.context.extensionPath;
        const paths = [extensionPath, 'media', ...mediaPath];
        return vscode.Uri.file(path.join.apply(path, paths));
    }

    dispose() {
        for (const item of this.disposables) {
            item.dispose();
        }
        this.disposables = [];
    }
}

function parseBoardJson(content: string) {
    try {
        content = JSON.parse(content);
    } catch {
        return null;
    }

    return content;
}
