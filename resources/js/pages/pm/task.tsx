import { PieceTaskView } from '@/components/piece-task-view';
import * as pmRoutes from '@/routes/pm';
import type { ContentPiece } from '@/types';

type Props = {
    piece: ContentPiece;
};

export default function PmTask({ piece }: Props) {
    return (
        <PieceTaskView
            piece={piece}
            submitVideoUrl={pmRoutes.submitVideo.url(piece.id)}
            backUrl={pmRoutes.tabla.url()}
            backLabel="Volver"
        />
    );
}
