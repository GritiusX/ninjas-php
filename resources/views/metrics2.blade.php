<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>/metrics2 — scraper Metricool ({{ $client->name }})</title>
    <style>
        body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 820px; margin: 0 auto; }
        h1 { font-size: 1.25rem; margin-bottom: 0.25rem; }
        p.range { font-size: 0.85rem; color: #6b7280; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
        td, th { text-align: left; padding: 0.45rem 0.6rem; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; }
        th { color: #6b7280; font-weight: 500; }
        td.val { font-weight: 600; color: #111827; }
        td.empty { color: #d1d5db; font-style: italic; }
        .section { border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
        .section-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .badge { font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 9999px; font-weight: 600; }
        .badge-fb  { background: #dbeafe; color: #1d4ed8; }
        .badge-ig  { background: #fce7f3; color: #9d174d; }
        .badge-tt  { background: #f3e8ff; color: #6b21a8; }
        .badge-yt  { background: #fee2e2; color: #991b1b; }
        .badge-ga  { background: #d1fae5; color: #065f46; }
        .badge-gen { background: #f1f5f9; color: #374151; }
        .error { color: #b91c1c; background: #fee2e2; padding: 0.75rem 1rem; border-radius: 0.5rem; white-space: pre-wrap; font-size: 0.85rem; }
        .debug { font-size: 0.75rem; color: #9ca3af; margin-top: 0.75rem; }
        .cache-badge { font-size: 0.7rem; padding: 0.1rem 0.5rem; border-radius: 9999px; background: #d1fae5; color: #065f46; font-weight: 500; }
        .live-badge  { font-size: 0.7rem; padding: 0.1rem 0.5rem; border-radius: 9999px; background: #fef3c7; color: #92400e; font-weight: 500; }
        .sub-header td { font-weight: 600; color: #111827; font-size: 0.8rem; background: #f9fafb; padding-top: 0.6rem; }
    </style>
</head>
<body>
    <h1>{{ $client->name }} — scraper Metricool</h1>
    <p class="range">Rango: {{ \Carbon\Carbon::parse($start)->format('d/m/Y') }} — {{ \Carbon\Carbon::parse($end)->format('d/m/Y') }}</p>

    @foreach ($networkResults as $network => $result)
        @php
            $data      = $result['data'];
            $fromCache = $result['fromCache'];
            $error     = $result['error'];

            $badgeClass = match($network) {
                'facebook'  => 'badge-fb',
                'instagram' => 'badge-ig',
                'tiktok'    => 'badge-tt',
                'youtube'   => 'badge-yt',
                'googleAds' => 'badge-ga',
                default     => 'badge-gen',
            };
            $label = match($network) {
                'facebook'  => 'Facebook · Evolución',
                'instagram' => 'Instagram · Evolución',
                'tiktok'    => 'TikTok · Evolución',
                'youtube'   => 'YouTube · Evolución',
                'googleAds' => 'Google Ads · Evolución',
                default     => ucfirst($network) . ' · Evolución',
            };
            $badgeName = match($network) {
                'facebook'  => 'FB',
                'instagram' => 'IG',
                'tiktok'    => 'TT',
                'youtube'   => 'YT',
                'googleAds' => 'GA',
                default     => strtoupper(substr($network, 0, 2)),
            };
        @endphp

        <div class="section">
            <div class="section-title">
                <span class="badge {{ $badgeClass }}">{{ $badgeName }}</span> {{ $label }}
                @if ($fromCache)
                    <span class="cache-badge">desde cache</span>
                @elseif ($data)
                    <span class="live-badge">scrapeado ahora</span>
                @endif
            </div>

            @if ($error)
                <p class="error">{{ $error }}</p>

            @elseif ($network === 'facebook' && $data)
                <table>
                    <tr><th>Crecimiento de seguidores</th><td class="{{ $data['followers_growth'] ? 'val' : 'empty' }}">{{ $data['followers_growth'] ?? '—' }}</td></tr>
                    <tr><th>Visualizaciones</th><td class="{{ $data['views'] ? 'val' : 'empty' }}">{{ $data['views'] ?? '—' }}</td></tr>
                </table>

            @elseif ($network === 'instagram' && $data)
                @php $igVal = fn($key) => $data[$key] ?? null; @endphp
                <table>
                    <tr class="sub-header"><td colspan="2">Totales acumulados</td></tr>
                    <tr><th>Seguidores (total)</th><td class="{{ $igVal('followers_total') ? 'val' : 'empty' }}">{{ $igVal('followers_total') ?? '—' }}</td></tr>
                    <tr><th>Siguiendo (total)</th><td class="{{ $igVal('following_total') ? 'val' : 'empty' }}">{{ $igVal('following_total') ?? '—' }}</td></tr>
                    <tr><th>Contenido total</th><td class="{{ $igVal('content_total') ? 'val' : 'empty' }}">{{ $igVal('content_total') ?? '—' }}</td></tr>

                    <tr class="sub-header"><td colspan="2">Período ({{ \Carbon\Carbon::parse($start)->format('d/m') }} – {{ \Carbon\Carbon::parse($end)->format('d/m') }})</td></tr>
                    <tr><th>Seguidores ganados</th><td class="{{ $igVal('followers_gained') ? 'val' : 'empty' }}">{{ $igVal('followers_gained') ?? '—' }}</td></tr>
                    <tr><th>Seguidores diarios</th><td class="{{ $igVal('followers_daily') ? 'val' : 'empty' }}">{{ $igVal('followers_daily') ?? '—' }}</td></tr>
                    <tr><th>Seguidores por publicación</th><td class="{{ $igVal('followers_per_post') ? 'val' : 'empty' }}">{{ $igVal('followers_per_post') ?? '—' }}</td></tr>
                    <tr><th>Siguiendo (delta)</th><td class="{{ $igVal('following_net') !== null ? 'val' : 'empty' }}">{{ $igVal('following_net') ?? '—' }}</td></tr>
                    <tr><th>Publicaciones por día</th><td class="{{ $igVal('posts_per_day') ? 'val' : 'empty' }}">{{ $igVal('posts_per_day') ?? '—' }}</td></tr>
                    <tr><th>Publicaciones por semana</th><td class="{{ $igVal('posts_per_week') ? 'val' : 'empty' }}">{{ $igVal('posts_per_week') ?? '—' }}</td></tr>
                </table>
                @if (!empty($data['_delta_boxes']))
                    <div class="debug">Delta boxes: {{ collect($data['_delta_boxes'])->map(fn($v,$k) => "{$k}: {$v}")->implode(' · ') }}</div>
                @endif

            @elseif ($data)
                {{-- Redes genéricas (TikTok, YouTube, Google Ads): mostramos todos los boxes por índice --}}
                <table>
                    @foreach ($data as $key => $value)
                        @if (!str_starts_with($key, '_'))
                            <tr>
                                <th>{{ $key }}</th>
                                <td class="{{ $value ? 'val' : 'empty' }}">{{ $value ?? '—' }}</td>
                            </tr>
                        @endif
                    @endforeach
                </table>

            @else
                <p class="debug">Sin datos</p>
            @endif
        </div>
    @endforeach
</body>
</html>
