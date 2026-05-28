<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleAdsService
{
    private string $developerToken;
    private string $clientId;
    private string $clientSecret;
    private string $refreshToken;
    private string $loginCustomerId;
    private string $apiVersion;

    public function __construct()
    {
        $this->developerToken  = config('services.google_ads.developer_token', '');
        $this->clientId        = config('services.google_ads.client_id', '');
        $this->clientSecret    = config('services.google_ads.client_secret', '');
        $this->refreshToken    = config('services.google_ads.refresh_token', '');
        $this->loginCustomerId = config('services.google_ads.login_customer_id', '');
        $this->apiVersion      = config('services.google_ads.api_version', 'v18');
    }

    public function isConfigured(): bool
    {
        return ! empty($this->developerToken)
            && ! empty($this->clientId)
            && ! empty($this->clientSecret)
            && ! empty($this->refreshToken);
    }

    /**
     * Devuelve métricas diarias de un customer para el rango dado.
     *
     * @return array<int, array{date: string, investment: float, revenue: float, transactions: int}>
     */
    public function fetchMetrics(string $customerId, string $from, string $to): array
    {
        if (! $this->isConfigured()) {
            Log::warning('[GoogleAds] Credenciales no configuradas.');
            return [];
        }

        $accessToken = $this->getAccessToken();
        if (! $accessToken) {
            return [];
        }

        // Remover guiones del customer ID (la API los rechaza)
        $customerId = str_replace('-', '', $customerId);

        $query = <<<GAQL
            SELECT
                segments.date,
                metrics.cost_micros,
                metrics.conversions_value,
                metrics.conversions
            FROM campaign
            WHERE segments.date BETWEEN '{$from}' AND '{$to}'
              AND campaign.status = 'ENABLED'
            GAQL;

        $headers = [
            'Authorization'           => "Bearer {$accessToken}",
            'developer-token'         => $this->developerToken,
            'Content-Type'            => 'application/json',
        ];

        if ($this->loginCustomerId) {
            $headers['login-customer-id'] = str_replace('-', '', $this->loginCustomerId);
        }

        $response = Http::withHeaders($headers)
            ->post(
                "https://googleads.googleapis.com/{$this->apiVersion}/customers/{$customerId}/googleAds:search",
                ['query' => $query]
            );

        if ($response->failed()) {
            Log::error('[GoogleAds] Error al obtener métricas', [
                'customer' => $customerId,
                'status'   => $response->status(),
                'response' => $response->body(),
            ]);
            return [];
        }

        $results = $response->json('results', []);

        // Agregar por fecha (la query devuelve una fila por campaña por día)
        $byDate = [];
        foreach ($results as $row) {
            $date         = $row['segments']['date'];
            $costMicros   = (int) ($row['metrics']['costMicros'] ?? 0);
            $revenue      = (float) ($row['metrics']['conversionsValue'] ?? 0);
            $transactions = (float) ($row['metrics']['conversions'] ?? 0);

            if (! isset($byDate[$date])) {
                $byDate[$date] = ['investment' => 0.0, 'revenue' => 0.0, 'transactions' => 0];
            }

            $byDate[$date]['investment']   += $costMicros / 1_000_000;
            $byDate[$date]['revenue']      += $revenue;
            $byDate[$date]['transactions'] += (int) $transactions;
        }

        return array_map(
            fn ($date, $metrics) => ['date' => $date, ...$metrics],
            array_keys($byDate),
            array_values($byDate)
        );
    }

    private function getAccessToken(): ?string
    {
        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $this->refreshToken,
            'grant_type'    => 'refresh_token',
        ]);

        if ($response->failed()) {
            Log::error('[GoogleAds] Error al obtener access token', [
                'status'   => $response->status(),
                'response' => $response->body(),
            ]);
            return null;
        }

        return $response->json('access_token');
    }
}
