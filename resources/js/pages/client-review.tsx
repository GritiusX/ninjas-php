import { router } from '@inertiajs/react';
import { useState } from 'react';

type Props = {
    piece: {
        id: number;
        client_name: string;
        final_video_link: string | null;
        client_chosen_copy: string | null;
        copy_text: string | null;
        status: string;
    };
    already_responded: boolean;
    decision?: 'approve' | 'reject';
    token: string;
    error?: string;
};

type DecisionOption = 'approve' | 'approve_comment' | 'reject';

export default function ClientReview({ piece, already_responded, decision, token, error }: Props) {
    const [selected, setSelected] = useState<DecisionOption | null>(null);
    const [processing, setProcessing] = useState(false);
    const [comment, setComment] = useState('');
    const [commentError, setCommentError] = useState<string | null>(null);

    function submit(e: React.FormEvent) {
        e.preventDefault();

        if (!selected) return;

        const finalDecision: 'approve' | 'reject' =
            selected === 'reject' ? 'reject' : 'approve';

        if (selected === 'reject' && !comment.trim()) {
            setCommentError('Este campo es requerido para solicitar cambios.');
            return;
        }

        setCommentError(null);
        setProcessing(true);

        router.post(
            `/review/${token}/respond`,
            { decision: finalDecision, comment },
            { onFinish: () => setProcessing(false) },
        );
    }

    const showCommentBox = selected === 'approve_comment' || selected === 'reject';

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                            <span className="text-white text-xs font-bold">LN</span>
                        </div>
                        <span className="font-bold text-gray-900 text-lg">Little Ninjas</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mt-4">Revisión de contenido</h1>
                    <p className="text-gray-500 mt-1">
                        Para <span className="font-semibold text-gray-700">{piece.client_name}</span>
                    </p>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Video */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4">
                    <div className="px-5 pt-5 pb-3">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Video</h2>
                    </div>
                    {piece.final_video_link ? (
                        <div className="px-5 pb-5 space-y-3">
                            <div className="aspect-video rounded-xl bg-gray-100 overflow-hidden">
                                {piece.final_video_link.includes('drive.google.com') ? (
                                    <iframe
                                        src={piece.final_video_link.replace('/view', '/preview')}
                                        className="w-full h-full"
                                        allow="autoplay"
                                        allowFullScreen
                                    />
                                ) : (
                                    <video
                                        src={piece.final_video_link}
                                        controls
                                        className="w-full h-full object-contain"
                                    />
                                )}
                            </div>
                            <a
                                href={piece.final_video_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                                {piece.final_video_link.includes('drive.google.com')
                                    ? 'Abrir en Drive'
                                    : 'Abrir enlace'} &rarr;
                            </a>
                        </div>
                    ) : (
                        <div className="px-5 pb-5">
                            <div className="aspect-video rounded-xl bg-gray-100 flex items-center justify-center">
                                <p className="text-gray-400 text-sm">El video aún no está disponible</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Copy */}
                {piece.copy_text && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-5 mb-4">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Copy
                        </h2>
                        <p className="text-gray-800 leading-relaxed text-sm whitespace-pre-wrap">{piece.copy_text}</p>
                    </div>
                )}

                {/* Response area */}
                {already_responded ? (
                    <div
                        className={`rounded-2xl border px-5 py-6 text-center ${
                            decision === 'approve'
                                ? 'bg-green-50 border-green-200'
                                : 'bg-orange-50 border-orange-200'
                        }`}
                    >
                        {decision === 'approve' ? (
                            <>
                                <div className="text-4xl mb-3">✅</div>
                                <p className="font-semibold text-green-700 text-lg">
                                    ¡Gracias! Tu aprobación fue registrada.
                                </p>
                                <p className="text-green-600 text-sm mt-1">
                                    El equipo fue notificado y procederá con la publicación.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="text-4xl mb-3">📝</div>
                                <p className="font-semibold text-orange-700 text-lg">
                                    Tus comentarios fueron enviados al equipo.
                                </p>
                                <p className="text-orange-600 text-sm mt-1">
                                    Vamos a revisar tus sugerencias y te contactaremos a la brevedad.
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <form onSubmit={submit}>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-5 space-y-4">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                Tu respuesta
                            </h2>

                            {/* Options */}
                            <div className="space-y-2">
                                {/* Approve */}
                                <label
                                    className={`flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                                        selected === 'approve'
                                            ? 'border-green-400 bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="decision_option"
                                        value="approve"
                                        checked={selected === 'approve'}
                                        onChange={() => {
                                            setSelected('approve');
                                            setComment('');
                                            setCommentError(null);
                                        }}
                                        className="accent-green-600"
                                    />
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">Apruebo</p>
                                        <p className="text-xs text-gray-400">El contenido está listo para publicar</p>
                                    </div>
                                </label>

                                {/* Approve with comment */}
                                <label
                                    className={`flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                                        selected === 'approve_comment'
                                            ? 'border-green-400 bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="decision_option"
                                        value="approve_comment"
                                        checked={selected === 'approve_comment'}
                                        onChange={() => setSelected('approve_comment')}
                                        className="accent-green-600"
                                    />
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">Apruebo con un comentario</p>
                                        <p className="text-xs text-gray-400">Apruebo pero quiero agregar algo</p>
                                    </div>
                                </label>

                                {/* Reject */}
                                <label
                                    className={`flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                                        selected === 'reject'
                                            ? 'border-orange-400 bg-orange-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="decision_option"
                                        value="reject"
                                        checked={selected === 'reject'}
                                        onChange={() => setSelected('reject')}
                                        className="accent-orange-500"
                                    />
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">Necesito cambios</p>
                                        <p className="text-xs text-gray-400">Indicá qué necesita ajustarse</p>
                                    </div>
                                </label>
                            </div>

                            {/* Comment textarea */}
                            {showCommentBox && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-600">
                                        {selected === 'reject'
                                            ? 'Comentarios (requerido)'
                                            : 'Tu comentario (opcional)'}
                                    </label>
                                    <textarea
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 min-h-[100px] resize-y"
                                        placeholder={
                                            selected === 'reject'
                                                ? '¿Qué cambios necesitás?'
                                                : '¿Querés agregar algo?'
                                        }
                                        value={comment}
                                        onChange={(e) => {
                                            setComment(e.target.value);
                                            setCommentError(null);
                                        }}
                                        autoFocus
                                    />
                                    {commentError && (
                                        <p className="text-xs text-red-600">{commentError}</p>
                                    )}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={
                                    processing ||
                                    !selected ||
                                    (selected === 'reject' && !comment.trim())
                                }
                                className={`w-full rounded-xl py-3 px-4 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    selected === 'reject'
                                        ? 'bg-orange-500 hover:bg-orange-400 text-white'
                                        : 'bg-gray-900 hover:bg-gray-700 text-white'
                                }`}
                            >
                                {processing ? 'Enviando...' : 'Enviar respuesta'}
                            </button>
                        </div>
                    </form>
                )}

                <p className="text-center text-xs text-gray-400 mt-6">
                    Little Ninjas — Agencia de video publicitario
                </p>
            </div>
        </div>
    );
}
