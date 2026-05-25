<?php

namespace App\Services\GoogleAds;

use Carbon\CarbonInterface;
use Google\Ads\GoogleAds\Lib\OAuth2TokenBuilder;
use Google\Ads\GoogleAds\Lib\V20\GoogleAdsClient;
use Google\Ads\GoogleAds\Lib\V20\GoogleAdsClientBuilder;
use Google\Ads\GoogleAds\V20\Services\SearchGoogleAdsRequest;
use Illuminate\Support\Facades\Log;

class GoogleAdsService
{
    private const MICROS = 1_000_000;

    public function getMonthlyMetrics(string $customerId, CarbonInterface $start, CarbonInterface $end): array
    {
        try {
            $client  = $this->buildClient();
            $service = $client->getGoogleAdsServiceClient();
            $cleanId = preg_replace('/[^0-9]/', '', $customerId);

            $query = sprintf(
                "SELECT metrics.cost_micros, metrics.impressions, metrics.clicks,
                        metrics.conversions, metrics.conversions_value
                 FROM customer
                 WHERE segments.date BETWEEN '%s' AND '%s'",
                $start->format('Y-m-d'),
                $end->format('Y-m-d'),
            );

            $request = new SearchGoogleAdsRequest([
                'customer_id' => $cleanId,
                'query'       => $query,
            ]);

            $spend        = 0.0;
            $impressions  = 0;
            $clicks       = 0;
            $conversions  = 0.0;
            $convValue    = 0.0;

            foreach ($service->search($request)->iterateAllElements() as $row) {
                $m = $row->getMetrics();
                $spend       += $m->getCostMicros() / self::MICROS;
                $impressions += $m->getImpressions();
                $clicks      += $m->getClicks();
                $conversions += $m->getConversions();
                $convValue   += $m->getConversionsValue();
            }

            return [
                'spend'             => $spend,
                'impressions'       => $impressions,
                'clicks'            => $clicks,
                'conversions'       => $conversions,
                'conversions_value' => $convValue,
                'cpc'               => $clicks > 0       ? round($spend / $clicks, 4)               : null,
                'ctr'               => $impressions > 0  ? round($clicks / $impressions * 100, 4)   : null,
                'cpm'               => $impressions > 0  ? round($spend / $impressions * 1000, 4)   : null,
                'roas'              => $spend > 0        ? round($convValue / $spend, 4)             : null,
                'cpa'               => $conversions > 0  ? round($spend / $conversions, 4)           : null,
            ];
        } catch (\Throwable $e) {
            Log::warning('GoogleAdsService::getMonthlyMetrics failed', [
                'customer_id' => $customerId,
                'error'       => $e->getMessage(),
            ]);
            return [];
        }
    }

    private function buildClient(): GoogleAdsClient
    {
        $oauth2 = (new OAuth2TokenBuilder())
            ->withClientId(config('google-ads.client_id'))
            ->withClientSecret(config('google-ads.client_secret'))
            ->withRefreshToken(config('google-ads.refresh_token'))
            ->build();

        return (new GoogleAdsClientBuilder())
            ->withDeveloperToken(config('google-ads.developer_token'))
            ->withLoginCustomerId((string) config('google-ads.login_customer_id'))
            ->withOAuth2Credential($oauth2)
            ->build();
    }
}
