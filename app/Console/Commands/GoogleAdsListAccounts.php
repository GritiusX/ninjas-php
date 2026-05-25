<?php

namespace App\Console\Commands;

use Google\Ads\GoogleAds\Lib\OAuth2TokenBuilder;
use Google\Ads\GoogleAds\Lib\V20\GoogleAdsClientBuilder;
use Google\Ads\GoogleAds\V20\Services\SearchGoogleAdsRequest;
use Illuminate\Console\Command;

class GoogleAdsListAccounts extends Command
{
    protected $signature   = 'google-ads:list-accounts';
    protected $description = 'Lista todas las cuentas de Google Ads bajo la MCC';

    public function handle(): int
    {
        $this->info('Consultando cuentas bajo la MCC...');

        try {
            $oauth2 = (new OAuth2TokenBuilder())
                ->withClientId(config('google-ads.client_id'))
                ->withClientSecret(config('google-ads.client_secret'))
                ->withRefreshToken(config('google-ads.refresh_token'))
                ->build();

            $client = (new GoogleAdsClientBuilder())
                ->withDeveloperToken(config('google-ads.developer_token'))
                ->withLoginCustomerId((string) config('google-ads.login_customer_id'))
                ->withOAuth2Credential($oauth2)
                ->build();

            $mccId = preg_replace('/[^0-9]/', '', (string) config('google-ads.login_customer_id'));

            $query = "SELECT
                        customer_client.id,
                        customer_client.descriptive_name,
                        customer_client.currency_code
                      FROM customer_client
                      WHERE customer_client.manager = FALSE
                        AND customer_client.status = 'ENABLED'";

            $request = new SearchGoogleAdsRequest([
                'customer_id' => $mccId,
                'query'       => $query,
            ]);

            $rows = [];
            foreach ($client->getGoogleAdsServiceClient()->search($request)->iterateAllElements() as $row) {
                $cc = $row->getCustomerClient();
                $id = (string) $cc->getId();
                $rows[] = [
                    $cc->getDescriptiveName(),
                    preg_replace('/(\d{3})(\d{3})(\d{4})/', '$1-$2-$3', $id),
                    $cc->getCurrencyCode(),
                ];
            }

            if (empty($rows)) {
                $this->warn('No se encontraron cuentas activas bajo la MCC.');
                return self::SUCCESS;
            }

            $this->table(['Nombre de cuenta', 'Customer ID', 'Moneda'], $rows);

            $this->newLine();
            $this->line('Cargá el Customer ID en Admin → Clientes → Editar → Google Ads Customer ID.');

        } catch (\Throwable $e) {
            $this->error('Error: ' . $e->getMessage());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
