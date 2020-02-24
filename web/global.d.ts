import * as Backend from "../out/shared";

declare global {

    function acquireVsCodeApi(): {
        postMessage(x: SeqGraphMessage): void
    };

    type SeqGraphMessage = Backend.SeqGraphMessage;
    type UpdateFilePath = Backend.UpdateFilePath;
    type UpdateGraph = Backend.UpdateGraph;

    type IncomingBoardNode = Backend.BoardNode<Backend.Vec2d>;

    type NodeRef = Backend.NodeRef;

    type BoardGraph = Backend.BoardGraph<Vec2d>;
    type BoardNode = Backend.BoardNode<Vec2d>;
}
