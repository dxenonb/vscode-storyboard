import * as Backend from "../out/shared";

declare global {

    interface VsCodeApi {
        postMessage(x: SeqGraphMessage): void;
        setState(state: PersistentEditorState): void;
        getState(): PersistentEditorState | null;
    }

    function acquireVsCodeApi(): VsCodeApi;

    type PersistentEditorState = Backend.PersistentEditorState;

    type SeqGraphMessage = Backend.SeqGraphMessage;
    type UpdateFilePath = Backend.UpdateFilePath;
    type UpdateGraph = Backend.UpdateGraph;

    type IncomingBoardNode = Backend.BoardNode<Backend.Vec2d>;

    type NodeRef = Backend.NodeRef;

    type BoardGraph = Backend.BoardGraph<Vec2d>;
    type BoardNode = Backend.BoardNode<Vec2d>;
}
