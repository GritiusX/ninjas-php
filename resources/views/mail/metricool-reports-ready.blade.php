<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: sans-serif; color: #1a1a1a; background: #f5f5f5; margin: 0; padding: 24px; }
        .card { background: #fff; border-radius: 8px; padding: 32px; max-width: 520px; margin: 0 auto; box-shadow: 0 1px 4px rgba(0,0,0,.1); }
        h1 { font-size: 20px; margin: 0 0 8px; }
        p { font-size: 15px; color: #444; line-height: 1.6; margin: 8px 0; }
        .btn { display: inline-block; margin-top: 20px; padding: 12px 28px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 600; }
        .note { margin-top: 16px; font-size: 13px; color: #666; background: #f0f4ff; border-left: 3px solid #2563eb; padding: 10px 14px; border-radius: 4px; }
        .footer { margin-top: 28px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 16px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Reportes Metricool listos — {{ $period }}</h1>
        <p>
            Se generaron y empaquetaron correctamente los reportes PDF de
            <strong>{{ $reportCount }} {{ $reportCount === 1 ? 'cliente' : 'clientes' }}</strong>
            correspondientes al período <strong>{{ $period }}</strong>.
        </p>
        <p>El ZIP está adjunto a este correo. Si el adjunto no carga, también podés descargarlo desde el siguiente link:</p>

        <a href="{{ $downloadUrl }}" class="btn">Descargar reportes (.zip)</a>

        <div class="note">
            El archivo también quedó guardado en el servidor por si necesitás descargarlo más tarde.
        </div>

        <div class="footer">
            Little Ninjas Agency OS &mdash; generado automáticamente el {{ now()->setTimezone('America/Argentina/Buenos_Aires')->format('d/m/Y H:i') }}
        </div>
    </div>
</body>
</html>
