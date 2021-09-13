import * as vscode from 'vscode';
import { Vec2d } from './model-types';
import { BoardEdge, BoardNode, StoryBoard } from './storyBoard';
import StoryBoardEditor from './storyBoardEditor';

export default class StoryBoardEditorProvider implements vscode.CustomTextEditorProvider {

    private disposables: vscode.Disposable[] = [];

    private static readonly viewType = 'sequenceGraph.storyBoard';

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new StoryBoardEditorProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(StoryBoardEditorProvider.viewType, provider);
		return providerRegistration;
    }

    constructor(
		private readonly context: vscode.ExtensionContext
    ) { }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        const storage = new StorageProvider(document);
        const editor = new StoryBoardEditor(webviewPanel, storage);

		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				editor.readBoard(deserialize(document.getText()));
			}
		});

        // TODO: should use the editor not the webviewPanel
		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});

        editor.readBoard(deserialize(document.getText()));
    }

    /**
	 * Write out the json to a given document.
	 */
	private updateTextDocument(document: vscode.TextDocument, json: any) {
		const edit = new vscode.WorkspaceEdit();

		// Just replace the entire document every time for this example extension.
		// A more complete extension should compute minimal edits instead.
		edit.replace(
			document.uri,
			new vscode.Range(0, 0, document.lineCount, 0),
			JSON.stringify(json, null, 2));

		return vscode.workspace.applyEdit(edit);
	}

    dispose() {
        for (const item of this.disposables) {
            item.dispose();
        }
        this.disposables = [];
    }
}

class StorageProvider<V extends Vec2d> {
    constructor(
        private readonly document: vscode.TextDocument,
    ) { }

    update(board: StoryBoard<V>) {

    }
}

function deserialize<V extends Vec2d>(json: string): StoryBoard<V> {
    const data = JSON.parse(json);
    const board = new StoryBoard<V>();
    for (const node of data.nodes) {
        const hydrated = Object.create(BoardNode);
        Object.assign(hydrated, node);
        board.addNode(hydrated);
    }
    for (const edges of data.edges) {
        board.connect(new BoardEdge(edges.start, edges.end));
    }
    return board;
}
