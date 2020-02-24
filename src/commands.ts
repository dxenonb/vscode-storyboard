import ExtensionState from "./extState";
import * as vscode from "vscode";
import { Disposable } from "vscode";

enum Commands {
    CreateBoard = 'extension.sequenceGraph.createBoard',
    OpenBoard = 'extension.sequenceGraph.openBoard',
}

export default class CommandDispatcher implements Disposable {

    private readonly extState: ExtensionState;

    private disposables: Disposable[];

    constructor(extState: ExtensionState) {
        this.extState = extState;
        this.disposables = [];

        this.registerCreateBoard();
        this.registerOpenBoard();
    }

    registerCreateBoard() {
        this.disposables.push(
            vscode.commands.registerCommand(Commands.CreateBoard, () => {
                this.extState.createBoardEditor();
            }),
        );
    }

    registerOpenBoard() {
        this.disposables.push(
            vscode.commands.registerTextEditorCommand(Commands.OpenBoard, (editor) => {
                this.extState.openBoardEditor(editor.document.uri);
            }),
        );
    }

    dispose() {
        for (const item of this.disposables) {
            item.dispose();
        }
        this.disposables = [];
    }
}
