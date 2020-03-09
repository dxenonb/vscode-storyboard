import * as vscode from "vscode";
import { ExtensionContext, Uri, Disposable } from "vscode";

import * as path from 'path';
import * as fs from 'fs';

import { EditorView, EditorViewResources } from "./editorView";
import { parseBoardJson } from "./model-utils";
import LABELS from "./labels";
import { PersistentEditorState } from "./model-types";

const BOARD_WEBVIEW_ID = 'sequenceGraph.boardEditor';

export default class ExtensionState implements Disposable {

    private editors: EditorView[];
    private editorsByFile: { [path: string]: EditorView };
    private context: ExtensionContext;
    private resources: EditorViewResources;
    private localResourceRoots: Uri[];
    private disposables: Disposable[];

    public constructor(context: ExtensionContext) {
        this.context = context;
        this.editors = [];
        this.editorsByFile = {};

        this.resources = {
            scriptVec2d: this.mediaUri(['vec2d.js']),
            scriptContextMenu: this.mediaUri(['contextMenu.js']),
            scriptMain: this.mediaUri(['main.js']),
            scriptCanvas: this.mediaUri(['canvas.js']),
            scriptNode: this.mediaUri(['nodeWrapper.js']),
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
        this.registerListeners();
    }

    public async createBoardEditor(panel?: vscode.WebviewPanel) {
        panel = panel || (
            vscode.window.createWebviewPanel(
			BOARD_WEBVIEW_ID,
			'new board',
			vscode.ViewColumn.Active,
			{
				enableScripts: true,
                localResourceRoots: this.localResourceRoots,
			},
		));

        const editor = new EditorView(panel, this.resources);
        this.editors.push(editor);

        return editor;
    }

    public async openBoardEditor(uri: Uri, panel?: vscode.WebviewPanel) {
        if (uri.scheme !== 'file') {
            vscode.window.showErrorMessage(LABELS.onlyLocalFsSupported);
            return null;
        }
        const fsPath = uri.fsPath;
        let content;
        try {
            content = await fs.promises.readFile(fsPath, { encoding: 'utf-8' });
        } catch {
            vscode.window.showErrorMessage(LABELS.openFailed);
            return null;
        }
        let document;
        try {
            document = parseBoardJson(content);
            if (!document) {
                return null;
            }
        } catch (e) {
            console.log('got exception while opening:', e);
            vscode.window.showErrorMessage(LABELS.invalidFormat);
            return null;
        }
        const board = await this.createBoardEditor(panel);
        board.loadBoard(fsPath, document);
        this.editorsByFile[fsPath] = board;
        return board;
    }

    async restoreBoardEditor(
        panel: vscode.WebviewPanel,
        state: PersistentEditorState | null,
    ) {
        if (state && state.isSaved) {
            const uri = Uri.file(state.fsPath);
            return this.openBoardEditor(uri, panel);
        }
        // TODO: load unsaved board
        return this.createBoardEditor(panel);
    }

    private registerListeners() {
        this.disposables.push(
            vscode.workspace.onDidOpenTextDocument((document) => {
                const uri = document.uri;
                const path = document.uri.fsPath;
                if (uri.scheme === 'file' && path.endsWith('.seqgraph.json')) {
                    const message = LABELS.openFileToolTip;
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
    private sequenceGraph: ExtensionState;

    constructor(sequenceGraph: ExtensionState) {
        this.sequenceGraph = sequenceGraph;
    }

    deserializeWebviewPanel(panel: vscode.WebviewPanel, state: any): Thenable<void> {
        return this.sequenceGraph.restoreBoardEditor(panel, state)
            .then(() => { });
    }
}
