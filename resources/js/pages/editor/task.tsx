import { PieceTaskView } from '@/components/piece-task-view';
import * as editorRoutes from '@/routes/editor';
import type { ContentPiece } from '@/types';

type Props = {
    piece: ContentPiece;
};

export default function EditorTask({ piece }: Props) {
    return (
        <PieceTaskView
            piece={piece}
            submitVideoUrl={editorRoutes.submitVideo.url(piece.id)}
            backUrl={editorRoutes.dashboard.url()}
            backLabel="Mis tareas"
        />
    );
}
