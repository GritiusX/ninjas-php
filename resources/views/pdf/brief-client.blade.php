<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: DejaVu Sans, Helvetica, sans-serif;
        font-size: 9px;
        color: #111827;
        background: #fff;
        padding: 24px 28px;
        line-height: 1.4;
    }

    .header {
        margin-bottom: 18px;
        border-bottom: 2px solid #111827;
        padding-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
    }
    .client-name {
        font-size: 18px;
        font-weight: bold;
        color: #111827;
    }
    .subtitle {
        font-size: 9px;
        color: #6b7280;
        margin-top: 3px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .meta-right {
        font-size: 8px;
        color: #9ca3af;
        text-align: right;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
    }
    th {
        background: #111827;
        color: #fff;
        font-size: 7.5px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        padding: 6px 6px;
        text-align: left;
        vertical-align: bottom;
    }
    td {
        padding: 6px 6px;
        vertical-align: top;
        border-bottom: 1px solid #e5e7eb;
        font-size: 8.5px;
        color: #111827;
        word-break: break-word;
    }
    tr:nth-child(even) td { background: #f9fafb; }
    tr:last-child td { border-bottom: none; }

    .text-muted { color: #9ca3af; font-style: italic; }

    .footer {
        margin-top: 16px;
        padding-top: 8px;
        border-top: 1px solid #e5e7eb;
        font-size: 7.5px;
        color: #9ca3af;
        display: flex;
        justify-content: space-between;
    }

    /* column widths */
    .col-num      { width: 5%; }
    .col-dev      { width: 70%; }
    .col-deadline { width: 25%; }
</style>
</head>
<body>

<div class="header">
    <div>
        <div class="client-name">{{ $client->name }}</div>
        <div class="subtitle">Brief completo de piezas — {{ $pieces->count() }} {{ $pieces->count() === 1 ? 'pieza' : 'piezas' }}</div>
    </div>
    <div class="meta-right">
        Generado el {{ now()->format('d/m/Y H:i') }}<br>
        Ninjas Studio
    </div>
</div>

@if($pieces->isEmpty())
    <p class="text-muted" style="padding: 20px 0;">No hay piezas registradas para este cliente.</p>
@else
<table>
    <thead>
        <tr>
            <th class="col-num">#</th>
            <th class="col-dev">Desarrollo de contenido</th>
            <th class="col-deadline">Deadline</th>
        </tr>
    </thead>
    <tbody>
        @foreach($pieces as $i => $piece)
        <tr>
            <td class="col-num">{{ $i + 1 }}</td>
            <td class="col-dev">{{ $piece->development ?? ($piece->concept ?? '—') }}</td>
            <td class="col-deadline">
                {{ $piece->deadline ? $piece->deadline->format('d/m/Y') : '—' }}
            </td>
        </tr>
        @endforeach
    </tbody>
</table>
@endif

<div class="footer">
    <span>Brief consolidado — {{ $client->name }}</span>
    <span>{{ now()->format('d/m/Y H:i') }} · Ninjas Studio</span>
</div>

</body>
</html>
