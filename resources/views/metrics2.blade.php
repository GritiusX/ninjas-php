<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>/metrics2 — scraper Metricool ({{ $client->name }})</title>
    <style>
        body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 760px; margin: 0 auto; }
        h1 { font-size: 1.25rem; margin-bottom: 0.25rem; }
        h2 { font-size: 1rem; margin: 1.5rem 0 0.5rem; color: #374151; }
        p.range { font-size: 0.85rem; color: #6b7280; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
        td, th { text-align: left; padding: 0.45rem 0.6rem; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; }
        th { color: #6b7280; font-weight: 500; }
        .section { border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
        .section-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .badge { font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 9999px; font-weight: 600; }
        .badge-fb { background: #dbeafe; color: #1d4ed8; }
        .badge-ig { background: #fce7f3; color: #9d174d; }
        .error { color: #b91c1c; background: #fee2e2; padding: 0.75rem 1rem; border-radius: 0.5rem; white-space: pre-wrap; font-size: 0.85rem; }
        .debug { font-size: 0.75rem; color: #9ca3af; margin-top: 0.5rem; }
        .null-val { color: #d1d5db; font-style: italic; }
        .cache-badge { font-size: 0.7rem; padding: 0.1rem 0.5rem; border-radius: 9999px; background: #d1fae5; color: #065f46; font-weight: 500; }
        .live-badge  { font-size: 0.7rem; padding: 0.1rem 0.5rem; border-radius: 9999px; background: #fef3c7; color: #92400e; font-weight: 500; }
        .separator { border: none; border-top: 1px dashed #e5e7eb; margin: 0.25rem 0; }
    </style>
</head>
<body>
    <h1>{{ $client->name }} — scraper Metricool</h1>
    <p class="range">Rango: {{ \Carbon\Carbon::parse($start)->format('d/m/Y') }} — {{ \Carbon\Carbon::parse($end)->format('d/m/Y') }}</p>

    {{-- FACEBOOK --}}
    <div class="section">
        <div class="section-title">
            <span class="badge badge-fb">FB</span> Facebook · Evolución
            @if ($fbFromCache)
                <span class="cache-badge">desde cache</span>
            @elseif ($fbData)
                <span class="live-badge">scrapeado ahora</span>
            @endif
        </div>

        @if ($fbError)
            <p class="error">{{ $fbError }}</p>
        @elseif ($fbData)
            <table>
                <tr><th>Crecimiento de seguidores</th><td>{{ $fbData['followers_growth'] ?? '—' }}</td></tr>
                <tr><th>Visualizaciones</th><td>{{ $fbData['views'] ?? '—' }}</td></tr>
            </table>
            @if ($fbData['screenshot'] ?? null)
                <p class="debug">Screenshot: {{ $fbData['screenshot'] }}</p>
            @endif
        @else
            <p class="null-val">Sin datos</p>
        @endif
    </div>

    {{-- INSTAGRAM --}}
    <div class="section">
        <div class="section-title">
            <span class="badge badge-ig">IG</span> Instagram · Evolución (Comunidad)
            @if ($igFromCache)
                <span class="cache-badge">desde cache</span>
            @elseif ($igData)
                <span class="live-badge">scrapeado ahora</span>
            @endif
        </div>

        @if ($igError)
            <p class="error">{{ $igError }}</p>
        @elseif ($igData)
            <table>
                <tr>
                    <th colspan="2" style="color:#111827; padding-bottom:0.25rem;">Totales acumulados</th>
                </tr>
                <tr><th>Seguidores (total)</th><td>{{ $igData['followers_total'] ?? '<span class="null-val">—</span>' }}</td></tr>
                <tr><th>Siguiendo (total)</th><td>{{ $igData['following_total'] ?? '<span class="null-val">—</span>' }}</td></tr>
                <tr><th>Contenido total</th><td>{{ $igData['content_total'] ?? '<span class="null-val">—</span>' }}</td></tr>
                <tr><td colspan="2" style="padding:0"><hr class="separator"></td></tr>
                <tr>
                    <th colspan="2" style="color:#111827; padding-bottom:0.25rem;">Período ({{ \Carbon\Carbon::parse($start)->format('d/m') }} – {{ \Carbon\Carbon::parse($end)->format('d/m') }})</th>
                </tr>
                <tr><th>Seguidores ganados</th><td>{{ $igData['followers_gained'] ?? '<span class="null-val">—</span>' }}</td></tr>
                <tr><th>Seguidores diarios</th><td>{{ $igData['followers_daily'] ?? '<span class="null-val">—</span>' }}</td></tr>
                <tr><th>Seguidores por publicación</th><td>{{ $igData['followers_per_post'] ?? '<span class="null-val">—</span>' }}</td></tr>
                <tr><th>Siguiendo (delta)</th><td>{{ $igData['following_net'] ?? '<span class="null-val">—</span>' }}</td></tr>
                <tr><th>Publicaciones por día</th><td>{{ $igData['posts_per_day'] ?? '<span class="null-val">—</span>' }}</td></tr>
                <tr><th>Publicaciones por semana</th><td>{{ $igData['posts_per_week'] ?? '<span class="null-val">—</span>' }}</td></tr>
            </table>
            <p class="debug">
                Boxes encontrados: {{ $igData['_boxes_count'] }}
                @if ($igData['screenshot'] ?? null) · Screenshot: {{ $igData['screenshot'] }} @endif
            </p>
        @else
            <p class="null-val">Sin datos</p>
        @endif
    </div>
</body>
</html>
