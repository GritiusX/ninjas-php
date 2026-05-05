<?php

namespace App\Http\Controllers\Webhook;

use App\Http\Controllers\Controller;
use App\Models\ContentPiece;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class WhatsAppWebhookController extends Controller
{
    public function __construct(
        private NotificationService $notifications,
        private WhatsAppService $whatsapp,
    ) {}

    public function verify(Request $request): Response|string
    {
        $mode      = $request->query('hub_mode');
        $token     = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        if ($mode === 'subscribe' && $token === config('services.whatsapp.webhook_verify_token')) {
            return response($challenge, 200);
        }

        abort(403);
    }

    public function receive(Request $request): JsonResponse
    {
        $payload = $request->all();

        Log::info('WhatsApp webhook received', $payload);

        // Validar que sea un evento de WhatsApp Business
        if (($payload['object'] ?? '') !== 'whatsapp_business_account') {
            return response()->json(['status' => 'ignored']);
        }

        foreach ($payload['entry'] ?? [] as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                $value = $change['value'] ?? [];

                foreach ($value['messages'] ?? [] as $msg) {
                    $this->processMessage($msg, $value['contacts'][0] ?? []);
                }
            }
        }

        return response()->json(['status' => 'ok']);
    }

    private function processMessage(array $msg, array $contact): void
    {
        $from = $msg['from'] ?? null;
        $text = trim($msg['text']['body'] ?? '');

        if (!$from || !$text) {
            return;
        }

        // Normalizar número para buscar en BD
        $normalizedFrom = '+' . ltrim(preg_replace('/[^\d]/', '', $from), '+');

        // Buscar cliente con ese número de WhatsApp
        $piece = ContentPiece::with('client')
            ->where('status', ContentPiece::STATUS_CLIENT_REVIEW)
            ->whereHas('client', fn ($q) => $q->where('whatsapp_number', $normalizedFrom)
                ->orWhere('whatsapp_number', $from)
            )
            ->orderByDesc('updated_at')
            ->first();

        if (!$piece) {
            Log::info("WhatsApp: no se encontró pieza en CLIENT_REVIEW para {$from}");
            return;
        }

        $contactName = $contact['profile']['name'] ?? $piece->client->name;
        $isApproval  = $this->detectsApproval($text);

        if ($isApproval) {
            $piece->update(['status' => ContentPiece::STATUS_CLIENT_APPROVED]);
            $this->notifications->notifyPmClientApproved($piece);
            $this->notifyPmByWhatsapp($piece, "✅ [{$piece->client->name}] El cliente aprobó el contenido.");
        } else {
            $piece->update([
                'status'          => ContentPiece::STATUS_CLIENT_REVISION,
                'client_feedback' => $text,
            ]);
            $this->notifications->notifyPmClientRequestedChanges($piece, $text);
            $this->notifyPmByWhatsapp($piece, "✏️ [{$piece->client->name}] El cliente pidió cambios: {$text}");
        }
    }

    private function detectsApproval(string $text): bool
    {
        $normalized = mb_strtolower($text);
        $keywords   = ['apruebo', 'aprobado', 'apruebo!', '👍', 'ok', 'perfecto', 'dale', 'listo'];

        foreach ($keywords as $keyword) {
            if (str_contains($normalized, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function notifyPmByWhatsapp(ContentPiece $piece, string $message): void
    {
        $pms = User::whereIn('role', ['pm', 'admin'])
            ->where('is_active', true)
            ->whereNotNull('whatsapp_number')
            ->get();

        foreach ($pms as $pm) {
            $this->whatsapp->sendPmNotification($pm->whatsapp_number, $message);
        }
    }
}
