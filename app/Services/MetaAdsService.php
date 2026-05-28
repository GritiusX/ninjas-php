<?php

namespace App\Services;

use App\Models\Client;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaAdsService
{
    private string $accessToken;
    private string $apiVersion;
    private string $baseUrl;

    public function __construct()
    {
        $this->accessToken = config('services.meta_ads.access_token', '');
        $this->apiVersion  = config('services.meta_ads.api_version', 'v19.0');
        $this->baseUrl     = "https://graph.facebook.com/{$this->apiVersion}";
    }

    public function isConfigured(?string $token = null): bool
    {
        return ! empty($token ?? $this->accessToken);
    }

    /**
     * Devuelve métricas diarias de un ad account para el rango dado.
     * Si se pasa $clientToken, se usa en lugar del token global del .env.
     *
     * @return array<int, array{date: string, investment: float, revenue: float, transactions: int}>
     */
    public function fetchMetrics(string $adAccountId, string $from, string $to, ?string $clientToken = null): array
    {
        $token = $clientToken ?? $this->accessToken;

        if (empty($token)) {
            Log::warning('[MetaAds] Credenciales no configuradas.', ['account' => $adAccountId]);
            return [];
        }

        // Normalizar: la API espera "act_XXXXXXXXX"
        $accountId = str_starts_with($adAccountId, 'act_') ? $adAccountId : "act_{$adAccountId}";

        $response = Http::get("{$this->baseUrl}/{$accountId}/insights", [
            'access_token' => $token,
            'fields'       => 'spend,actions,action_values',
            'time_range'   => json_encode(['since' => $from, 'until' => $to]),
            'time_increment' => 1,   // un registro por día
            'level'        => 'account',
        ]);

        if ($response->failed()) {
            Log::error('[MetaAds] Error al obtener métricas', [
                'account'  => $accountId,
                'status'   => $response->status(),
                'response' => $response->body(),
            ]);
            return [];
        }

        $data = $response->json('data', []);

        return array_map(fn ($row) => [
            'date'         => $row['date_start'],
            'investment'   => (float) ($row['spend'] ?? 0),
            'revenue'      => $this->extractActionValue($row['action_values'] ?? [], ['purchase', 'omni_purchase']),
            'transactions' => (int) $this->extractActionCount($row['actions'] ?? [], ['purchase', 'omni_purchase']),
        ], $data);
    }

    private function extractActionValue(array $actionValues, array $types): float
    {
        $total = 0.0;
        foreach ($actionValues as $av) {
            if (in_array($av['action_type'] ?? '', $types, true)) {
                $total += (float) ($av['value'] ?? 0);
            }
        }
        return $total;
    }

    private function extractActionCount(array $actions, array $types): float
    {
        $total = 0.0;
        foreach ($actions as $a) {
            if (in_array($a['action_type'] ?? '', $types, true)) {
                $total += (float) ($a['value'] ?? 0);
            }
        }
        return $total;
    }
}
