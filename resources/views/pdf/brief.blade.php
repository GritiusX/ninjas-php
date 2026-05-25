<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: DejaVu Sans, Helvetica, sans-serif;
        font-size: 11px;
        color: #111827;
        background: #fff;
        padding: 32px 36px;
        line-height: 1.5;
    }

    /* Header */
    .header { margin-bottom: 24px; border-bottom: 2px solid #111827; padding-bottom: 16px; }
    .client-name {
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #6b7280;
        margin-bottom: 6px;
    }
    .concept {
        font-size: 20px;
        font-weight: bold;
        color: #111827;
        margin-bottom: 10px;
        line-height: 1.3;
    }
    .meta { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
    .badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 9px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .priority-1 { background: #fee2e2; color: #991b1b; }
    .priority-2 { background: #ffedd5; color: #9a3412; }
    .priority-3 { background: #fef9c3; color: #92400e; }
    .deadline-label { font-size: 10px; color: #6b7280; }
    .deadline-value { font-weight: bold; color: #111827; }

    /* Sections */
    .section { margin-bottom: 18px; }
    .section-title {
        font-size: 9px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #6b7280;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 4px;
        margin-bottom: 8px;
    }
    .section-body { font-size: 11px; color: #111827; line-height: 1.6; }

    .box {
        padding: 10px 14px;
        border-radius: 4px;
        margin-top: 2px;
    }
    .box-hook { background: #f0f4ff; border-left: 3px solid #6366f1; }
    .box-cta  { background: #f0fdf4; border-left: 3px solid #22c55e; }
    .box-notes { background: #fffbeb; border-left: 3px solid #f59e0b; font-size: 10px; color: #78350f; }

    /* Material links */
    .link-item { margin-bottom: 4px; }
    .link-label { color: #6b7280; font-size: 10px; }
    .link-url { color: #2563eb; word-break: break-all; }

    /* Two-column grid */
    .grid-2 { width: 100%; }
    .grid-2 td { width: 50%; vertical-align: top; padding-right: 16px; }
    .grid-2 td:last-child { padding-right: 0; }

    /* Footer */
    .footer {
        margin-top: 36px;
        padding-top: 12px;
        border-top: 1px solid #e5e7eb;
        font-size: 9px;
        color: #9ca3af;
        display: flex;
        justify-content: space-between;
    }
    .editor-info { font-size: 10px; color: #374151; }
</style>
</head>
<body>

{{-- Header --}}
<div class="header">
    <div class="client-name">{{ $piece->client?->name ?? '—' }}</div>
    <div class="concept">{{ $piece->concept ?? $piece->product ?? 'Sin concepto' }}</div>
    <div class="meta">
        @php
            $priorityLabel = match((int)$piece->priority) { 1 => 'Crítico', 2 => 'Alto', default => 'Medio' };
            $priorityClass = 'priority-' . $piece->priority;
        @endphp
        <span class="badge {{ $priorityClass }}">{{ $priorityLabel }}</span>

        @if($piece->deadline)
            <span class="deadline-label">
                Deadline: <span class="deadline-value">{{ \Carbon\Carbon::parse($piece->deadline)->format('d/m/Y') }}</span>
            </span>
        @endif

        @if($piece->product)
            <span style="font-size:10px; color:#6b7280;">Producto: {{ $piece->product }}</span>
        @endif

        @if($piece->category)
            <span style="font-size:10px; color:#6b7280;">Categoría: {{ $piece->category }}</span>
        @endif
    </div>
</div>

{{-- Two-column: Objetivo + Editor --}}
<table class="grid-2" style="margin-bottom:18px;">
    <tr>
        <td>
            @if($piece->objective)
            <div class="section">
                <div class="section-title">Objetivo</div>
                <div class="section-body">{{ $piece->objective }}</div>
            </div>
            @endif
        </td>
        <td>
            @if($piece->editor)
            <div class="section">
                <div class="section-title">Editor asignado</div>
                <div class="editor-info">{{ $piece->editor->name }}</div>
            </div>
            @endif
        </td>
    </tr>
</table>

{{-- Hook --}}
@if($piece->hook)
<div class="section">
    <div class="section-title">🎬 Hook visual</div>
    <div class="box box-hook section-body">{{ $piece->hook }}</div>
</div>
@endif

{{-- Desarrollo --}}
@if($piece->development)
<div class="section">
    <div class="section-title">Desarrollo del contenido</div>
    <div class="section-body">{{ $piece->development }}</div>
</div>
@endif

{{-- CTA --}}
@if($piece->cta)
<div class="section">
    <div class="section-title">CTA</div>
    <div class="box box-cta section-body">{{ $piece->cta }}</div>
</div>
@endif

{{-- Material de referencia --}}
@php
    $links = array_filter(array_merge(
        $piece->raw_material_links ?? [],
        (!empty($piece->raw_material_link) && empty($piece->raw_material_links)) ? [$piece->raw_material_link] : []
    ));
@endphp
@if(count($links))
<div class="section">
    <div class="section-title">Material de referencia</div>
    @foreach($links as $i => $link)
        <div class="link-item">
            <span class="link-label">{{ count($links) > 1 ? 'Material ' . ($i + 1) . ': ' : '' }}</span>
            <span class="link-url">{{ $link }}</span>
        </div>
    @endforeach
</div>
@endif

{{-- Notas del PM --}}
@if($piece->brief_notes)
<div class="section">
    <div class="section-title">Notas para el editor</div>
    <div class="box box-notes">{{ $piece->brief_notes }}</div>
</div>
@endif

{{-- Footer --}}
<div class="footer">
    <span>Brief generado el {{ now()->format('d/m/Y H:i') }}</span>
    <span>Ninjas Studio</span>
</div>

</body>
</html>
