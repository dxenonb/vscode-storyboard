import * as vscode from "vscode";
import { ExtensionContext, Uri, Disposable, TextEditor } from "vscode";

import * as path from 'path';
import * as fs from 'fs';

import { BoardEditor, BoardViewResources } from "./board-editor";
import Commands from "./commands";
import { BoardNode, Vec2d, BoardGraph } from "./model";

const BOARD_WEBVIEW_ID = 'sequenceGraph.boardEditor';

// TODO: lift all messages into constants
const MESSAGES = {
    invalidFormat: 'Could not open the document. It is not a valid format for SequenceGraph.',
    openFailed: 'Failed to open board from JSON file.',
    onlyLocalFsSupported: 'Only local files are supported',
    openFileToolTip: 'Open this file in the board editor?',
};

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
            scriptVec2d: this.mediaUri(['vec2d.js']),
            scriptContextMenu: this.mediaUri(['context-menu.js']),
            scriptMain: this.mediaUri(['main.js']),
            scriptCanvas: this.mediaUri(['canvas.js']),
            scriptNode: this.mediaUri(['node.js']),
            style: this.mediaUri(['styles', 'board.css']),
        };

        this.localResourceRoots = [Uri.file(path.join(context.extensionPath, 'media'))];

        this.disposables = [];

        this.disposables.push(
            vscode.window.registerWebviewPanelSerializer(
                BOARD_WEBVIEW_ID,
                new WebviewSerializer(this),
            ),
        );
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
        this.editors.push(editor);

        return editor;
    }

    private async openBoardEditor(uri: Uri) {
        if (uri.scheme !== 'file') {
            vscode.window.showErrorMessage(MESSAGES.onlyLocalFsSupported);
            return null;
        }
        const path = uri.fsPath;
        let content;
        try {
            content = await fs.promises.readFile(path, { encoding: 'utf-8' });
        } catch {
            vscode.window.showErrorMessage(MESSAGES.openFailed);
            return null;
        }
        let document;
        try {
            document = parseBoardJson(content);
            if (!document) {
                return null;
            }
        } catch {
            vscode.window.showErrorMessage(MESSAGES.invalidFormat);
            return null;
        }
        const board = await this.createBoardEditor();
        board.loadBoard(document);
        this.editorsByFile[path] = board;
        return board;
    }

    async restoreBoardEditor(panel: vscode.WebviewPanel, state: any) {
        // TODO: incorporate state
        const editor = new BoardEditor(panel, this.resources);
        return editor;
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
                    const message = MESSAGES.openFileToolTip;
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

class WebviewSerializer implements vscode.WebviewPanelSerializer {
    private sequenceGraph: SequenceGraph;

    constructor(sequenceGraph: SequenceGraph) {
        this.sequenceGraph = sequenceGraph;
    }

    deserializeWebviewPanel(panel: vscode.WebviewPanel, state: any): Thenable<void> {
        return this.sequenceGraph.restoreBoardEditor(panel, state)
            .then(() => { });
    }
}

function parseBoardJson(text: string): BoardGraph<Vec2d> | null {
    let content: any;
    try {
        content = JSON.parse(text);
    } catch {
        return null;
    }

    if (!content || !content.nodes) {
        return null;
    }

    const nodes = content.nodes;
    for (const ref of Object.keys(nodes)) {
        const node = nodes[ref];
        if (!isNode(node)) {
            return null;
        }
    }

    return content as BoardGraph<Vec2d>;
}

function isNode(node: any): node is BoardNode<Vec2d> {
    return true
        && node.ref
        && node.pos && node.pos.x && node.pos.y
        && (node.color || node.color === null)
        && ((node.size && node.size.x && node.size.y) || node.size === null)
        && typeof node.header === 'string' && typeof node.content === 'string';
}
