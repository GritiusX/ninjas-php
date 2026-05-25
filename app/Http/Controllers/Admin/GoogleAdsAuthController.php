<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Google\Ads\GoogleAds\Lib\OAuth2TokenBuilder;
use Google\Ads\GoogleAds\Lib\V20\GoogleAdsClientBuilder;
use Google\Ads\GoogleAds\V20\Services\SearchGoogleAdsRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class GoogleAdsAuthController extends Controller
{
    private const SCOPE = 'https://www.googleapis.com/auth/adwords';

    public function redirect(): RedirectResponse
    {
        $url = 'https://accounts.google.com/o/oauth2/auth?' . http_build_query([
            'client_id'     => config('google-ads.client_id'),
            'redirect_uri'  => config('google-ads.redirect_uri'),
            'scope'         => self::SCOPE,
            'response_type' => 'code',
            'access_type'   => 'offline',
            'prompt'        => 'consent', // fuerza que Google emita refresh_token
        ]);

        return redirect($url);
    }

    public function callback(Request $request): Response|RedirectResponse
    {
        if ($request->has('error')) {
            return redirect()->route('admin.users.index')
                ->with('error', 'Autenticación con Google cancelada: ' . $request->get('error'));
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'code'          => $request->get('code'),
            'client_id'     => config('google-ads.client_id'),
            'client_secret' => config('google-ads.client_secret'),
            'redirect_uri'  => config('google-ads.redirect_uri'),
            'grant_type'    => 'authorization_code',
        ]);

        if ($response->failed()) {
            return redirect()->route('admin.users.index')
                ->with('error', 'Error al obtener el token de Google: ' . $response->body());
        }

        $refreshToken = $response->json('refresh_token');

        if (! $refreshToken) {
            return redirect()->route('admin.users.index')
                ->with('error', 'Google no devolvió refresh_token. Revocá el acceso en myaccount.google.com/permissions y volvé a intentar.');
        }

        // Escribir el refresh token en el .env
        $this->writeEnv('GOOGLE_ADS_REFRESH_TOKEN', $refreshToken);

        return Inertia::render('admin/google-ads-connected', [
            'refresh_token' => $refreshToken,
        ]);
    }

    public function accountsData(): JsonResponse
    {
        if (! config('google-ads.refresh_token')) {
            return response()->json(['error' => 'Google Ads no está conectado.'], 503);
        }

        try {
            $mccId  = preg_replace('/[^0-9]/', '', (string) config('google-ads.login_customer_id'));
            $oauth2 = (new OAuth2TokenBuilder())
                ->withClientId(config('google-ads.client_id'))
                ->withClientSecret(config('google-ads.client_secret'))
                ->withRefreshToken(config('google-ads.refresh_token'))
                ->build();

            $client = (new GoogleAdsClientBuilder())
                ->withDeveloperToken(config('google-ads.developer_token'))
                ->withLoginCustomerId($mccId)
                ->withOAuth2Credential($oauth2)
                ->build();

            $query   = "SELECT customer_client.id, customer_client.descriptive_name, customer_client.currency_code
                        FROM customer_client
                        WHERE customer_client.manager = FALSE AND customer_client.status = 'ENABLED'";
            $request = new SearchGoogleAdsRequest(['customer_id' => $mccId, 'query' => $query]);

            $accounts = [];
            foreach ($client->getGoogleAdsServiceClient()->search($request)->iterateAllElements() as $row) {
                $cc = $row->getCustomerClient();
                $accounts[] = [
                    'id'       => (string) $cc->getId(),
                    'name'     => $cc->getDescriptiveName(),
                    'currency' => $cc->getCurrencyCode(),
                ];
            }

            return response()->json(['accounts' => $accounts]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function accounts(): Response
    {
        $mccId = preg_replace('/[^0-9]/', '', (string) config('google-ads.login_customer_id'));

        $googleAccounts = [];

        if (config('google-ads.refresh_token')) {
            try {
                $oauth2 = (new OAuth2TokenBuilder())
                    ->withClientId(config('google-ads.client_id'))
                    ->withClientSecret(config('google-ads.client_secret'))
                    ->withRefreshToken(config('google-ads.refresh_token'))
                    ->build();

                $client = (new GoogleAdsClientBuilder())
                    ->withDeveloperToken(config('google-ads.developer_token'))
                    ->withLoginCustomerId($mccId)
                    ->withOAuth2Credential($oauth2)
                    ->build();

                $query = "SELECT customer_client.id, customer_client.descriptive_name, customer_client.currency_code
                          FROM customer_client
                          WHERE customer_client.manager = FALSE AND customer_client.status = 'ENABLED'";

                $request = new SearchGoogleAdsRequest(['customer_id' => $mccId, 'query' => $query]);

                foreach ($client->getGoogleAdsServiceClient()->search($request)->iterateAllElements() as $row) {
                    $cc = $row->getCustomerClient();
                    $id = (string) $cc->getId();
                    $googleAccounts[] = [
                        'id'       => $id,
                        'name'     => $cc->getDescriptiveName(),
                        'currency' => $cc->getCurrencyCode(),
                    ];
                }
            } catch (\Throwable $e) {
                // devuelve vacío, la vista muestra el error
            }
        }

        return Inertia::render('admin/google-ads-accounts', [
            'google_accounts' => $googleAccounts,
            'clients'         => Client::orderBy('name')->get(['id', 'name', 'google_ads_customer_id']),
            'connected'       => (bool) config('google-ads.refresh_token'),
        ]);
    }

    public function mapAccounts(Request $request): RedirectResponse
    {
        $mappings = $request->validate([
            'mappings'                  => ['required', 'array'],
            'mappings.*.client_id'      => ['required', 'exists:clients,id'],
            'mappings.*.customer_id'    => ['required', 'string', 'max:30'],
        ])['mappings'];

        foreach ($mappings as $mapping) {
            Client::where('id', $mapping['client_id'])
                ->update(['google_ads_customer_id' => $mapping['customer_id']]);
        }

        return back()->with('success', 'Cuentas de Google Ads mapeadas correctamente.');
    }

    private function writeEnv(string $key, string $value): void
    {
        $path = base_path('.env');
        $content = file_get_contents($path);

        if (str_contains($content, "{$key}=")) {
            $content = preg_replace("/^{$key}=.*/m", "{$key}={$value}", $content);
        } else {
            $content .= "\n{$key}={$value}";
        }

        file_put_contents($path, $content);
    }
}
