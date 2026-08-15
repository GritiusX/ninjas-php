export default function ClientReviewExpired() {
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center">
            <div className="max-w-xl mx-auto w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                            <span className="text-white text-xs font-bold">LN</span>
                        </div>
                        <span className="font-bold text-gray-900 text-lg">Little Ninjas</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-8 text-center">
                    <div className="text-4xl mb-3">🔗</div>
                    <p className="font-semibold text-gray-900 text-lg">Este link ya no es válido</p>
                    <p className="text-gray-500 text-sm mt-2">
                        Se subió una nueva versión del contenido y te enviamos un link actualizado.
                        Si no lo encontrás, pedíselo al equipo de Little Ninjas.
                    </p>
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">
                    Little Ninjas — Agencia de video publicitario
                </p>
            </div>
        </div>
    );
}
