<?php

namespace App\Services;

use App\Models\ContentPiece;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    private string $token;
    private string $phoneNumberId;
    private string $apiBase = 'https://graph.facebook.com/v19.0';

    public function __construct()
    {
        $this->token         = config('services.whatsapp.token') ?? '';
        $this->phoneNumberId = config('services.whatsapp.phone_number_id') ?? '';
    }

    public function sendClientApprovalMessage(ContentPiece $piece, string $reviewUrl = ''): bool
    {
        $to = $piece->client?->whatsapp_number;

        if (!$to || !$this->token || !$this->phoneNumberId) {
            Log::info('WhatsApp: sin configuración o número, saltando envío al cliente.', [
                'piece_id' => $piece->id,
            ]);
            return false;
        }

        if (!$reviewUrl && $piece->review_token) {
            $reviewUrl = url('/review/' . $piece->review_token);
        }

        $message = $this->buildClientMessage($piece, $reviewUrl);

        return $this->sendText($to, $message);
    }

    public function sendPmNotification(string $to, string $message): bool
    {
        if (!$to || !$this->token || !$this->phoneNumberId) {
            return false;
        }

        return $this->sendText($to, $message);
    }

    private function buildClientMessage(ContentPiece $piece, string $reviewUrl = ''): string
    {
        $objective = $piece->objective ?? 'sin descripción';
        $videoLink = $piece->final_video_link ?? '(link no disponible)';

        $msg = "Hola! 👋 Te compartimos el video finalizado para tu revisión.\n\n";
        $msg .= "🎬 *{$piece->client->name}* — {$objective}\n\n";
        $msg .= "📎 Ver video: {$videoLink}\n";

        $copy = $piece->generated_copy;
        $chosenVariant = $piece->client_chosen_copy;

        if ($copy && $chosenVariant && isset($copy[$chosenVariant])) {
            $msg .= "\n✍️ *Copy sugerido:*\n{$copy[$chosenVariant]}\n";
        }

        if ($reviewUrl) {
            $msg .= "\n🔗 Aprobá o pedí cambios desde acá: {$reviewUrl}";
        } else {
            $msg .= "\nRespondé con *APRUEBO* o contanos qué cambios necesitás.";
        }

        return $msg;
    }

    private function sendText(string $to, string $body): bool
    {
        // Normalizar número (sacar espacios, asegurar prefijo internacional)
        $to = preg_replace('/[^\d+]/', '', $to);

        $response = Http::withToken($this->token)
            ->timeout(10)
            ->post("{$this->apiBase}/{$this->phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'to'                => $to,
                'type'              => 'text',
                'text'              => ['body' => $body],
            ]);

        if ($response->failed()) {
            Log::error('WhatsApp: error al enviar mensaje', [
                'to'     => $to,
                'status' => $response->status(),
                'body'   => $response->json(),
            ]);
            return false;
        }

        return true;
    }
}
