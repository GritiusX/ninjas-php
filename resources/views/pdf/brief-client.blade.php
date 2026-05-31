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

    .badge {
        display: inline-block;
        padding: 1px 6px;
        border-radius: 999px;
        font-size: 7px;
        font-weight: bold;
        text-transform: uppercase;
    }
    .priority-1 { background: #fee2e2; color: #991b1b; }
    .priority-2 { background: #ffedd5; color: #9a3412; }
    .priority-3 { background: #fef9c3; color: #92400e; }

    .status-badge {
        display: inline-block;
        padding: 1px 6px;
        border-radius: 3px;
        font-size: 7px;
        font-weight: bold;
        text-transform: uppercase;
        background: #e5e7eb;
        color: #374151;
    }

    .text-muted { color: #9ca3af; font-style: italic; }
    .text-link { color: #2563eb; word-break: break-all; }

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
    .col-num      { width: 2.5%; }
    .col-concepto { width: 11%; }
    .col-producto { width: 8%; }
    .col-cat      { width: 6%; }
    .col-status   { width: 7%; }
    .col-prio     { width: 5%; }
    .col-deadline { width: 6.5%; }
    .col-editor   { width: 6.5%; }
    .col-objetivo { width: 10%; }
    .col-hook     { width: 10%; }
    .col-dev      { width: 13%; }
    .col-cta      { width: 7%; }
    .col-notas    { width: 8%; }
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
            <th class="col-concepto">Concepto</th>
            <th class="col-producto">Producto</th>
            <th class="col-cat">Categoría</th>
            <th class="col-status">Estado</th>
            <th class="col-prio">Prioridad</th>
            <th class="col-deadline">Deadline</th>
            <th class="col-editor">Editor</th>
            <th class="col-objetivo">Objetivo</th>
            <th class="col-hook">Hook visual</th>
            <th class="col-dev">Desarrollo</th>
            <th class="col-cta">CTA</th>
            <th class="col-notas">Notas PM</th>
        </tr>
    </thead>
    <tbody>
        @foreach($pieces as $i => $piece)
        @php
            $priorityLabel = match((int)$piece->priority) { 1 => 'Crítico', 2 => 'Alto', default => 'Medio' };
            $priorityClass = 'priority-' . $piece->priority;
            $statusLabels = [
                'BRIEF'           => 'Brief',
                'EDITING'         => 'Edición',
                'INTERNAL_REVIEW' => 'Revisión int.',
                'REVISION'        => 'Revisión',
                'PM_APPROVED'     => 'Aprobado PM',
                'CLIENT_REVIEW'   => 'Rev. cliente',
                'CLIENT_REVISION' => 'Rev. cliente 2',
                'CLIENT_APPROVED' => 'Aprobado',
            ];
            $links = array_filter(array_merge(
                $piece->raw_material_links ?? [],
                (!empty($piece->raw_material_link) && empty($piece->raw_material_links)) ? [$piece->raw_material_link] : []
            ));
        @endphp
        <tr>
            <td class="col-num">{{ $i + 1 }}</td>
            <td class="col-concepto">{{ $piece->concept ?? '—' }}</td>
            <td class="col-producto">{{ $piece->product ?? '—' }}</td>
            <td class="col-cat">{{ $piece->category ?? '—' }}</td>
            <td class="col-status">
                <span class="status-badge">{{ $statusLabels[$piece->status] ?? $piece->status }}</span>
            </td>
            <td class="col-prio">
                <span class="badge {{ $priorityClass }}">{{ $priorityLabel }}</span>
            </td>
            <td class="col-deadline">
                {{ $piece->deadline ? $piece->deadline->format('d/m/Y') : '—' }}
            </td>
            <td class="col-editor">{{ $piece->editor?->name ?? '—' }}</td>
            <td class="col-objetivo">{{ $piece->objective ?? '—' }}</td>
            <td class="col-hook">{{ $piece->hook ?? '—' }}</td>
            <td class="col-dev">
                {{ $piece->development ?? '—' }}
                @if(count($links))
                    <br>
                    @foreach($links as $j => $link)
                        <span class="text-link">{{ count($links) > 1 ? ($j+1).'. ' : '' }}{{ $link }}</span><br>
                    @endforeach
                @endif
            </td>
            <td class="col-cta">{{ $piece->cta ?? '—' }}</td>
            <td class="col-notas">{{ $piece->brief_notes ?? '—' }}</td>
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
