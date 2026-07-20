<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>/metrics2 — scraper Metricool (Aura Natural)</title>
    <style>
        body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 640px; margin: 0 auto; }
        h1 { font-size: 1.25rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        td, th { text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd; }
        .error { color: #b91c1c; background: #fee2e2; padding: 1rem; border-radius: 0.5rem; white-space: pre-wrap; }
    </style>
</head>
<body>
    <h1>{{ $client->name }} — Facebook (scraper Metricool)</h1>
    <p>Rango pedido: {{ \Carbon\Carbon::parse('2026-06-20')->format('d/m/Y') }} — {{ \Carbon\Carbon::parse('2026-07-19')->format('d/m/Y') }}</p>

    @if ($error)
        <p class="error">{{ $error }}</p>
    @else
        <table>
            <tr>
                <th>Crecimiento de seguidores</th>
                <td>{{ $data['followers_growth'] }}</td>
            </tr>
            <tr>
                <th>Visualizaciones</th>
                <td>{{ $data['views'] }}</td>
            </tr>
        </table>
        @if ($data['screenshot'])
            <p style="font-size: 0.8rem; color: #666;">
                Screenshot guardado en el servidor (para confirmar visualmente el rango mostrado): {{ $data['screenshot'] }}
            </p>
        @endif
    @endif
</body>
</html>
