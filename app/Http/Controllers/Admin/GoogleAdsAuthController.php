<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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
