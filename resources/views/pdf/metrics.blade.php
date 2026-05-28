<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: DejaVu Sans, Helvetica, sans-serif;
        font-size: 10px;
        color: #111827;
        background: #fff;
        padding: 28px 32px;
        line-height: 1.5;
    }

    .brand {
        font-size: 8px;
        font-weight: bold;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #9ca3af;
    }
    .client-name {
        font-size: 20px;
        font-weight: bold;
        color: #111827;
        margin-top: 3px;
    }
    .period-label {
        font-size: 13px;
        color: #6366f1;
        font-weight: bold;
        text-align: right;
        text-transform: capitalize;
    }
    .report-subtitle {
        font-size: 8px;
        color: #9ca3af;
        text-align: right;
        margin-top: 2px;
    }

    .summary-card {
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        padding: 9px 11px;
        background: #fff;
        vertical-align: top;
    }
    .summary-card-label {
        font-size: 7.5px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 3px;
    }
    .summary-card-value {
        font-size: 15px;
        font-weight: bold;
        color: #111827;
        line-height: 1.2;
    }
    .summary-card-delta {
        display: inline-block;
        margin-top: 4px;
        padding: 1px 6px;
        border-radius: 10px;
        font-size: 7.5px;
        font-weight: bold;
    }
    .badge-up   { background: #dcfce7; color: #15803d; }
    .badge-down { background: #fee2e2; color: #b91c1c; }
    .badge-flat { background: #fef9c3; color: #92400e; }
    .badge-none { background: #f3f4f6; color: #6b7280; }

    .area { margin-bottom: 18px; }
    .area-header {
        background: #111827;
        color: #fff;
        padding: 5px 10px;
        font-size: 8px;
        font-weight: bold;
        letter-spacing: 1.5px;
        text-transform: uppercase;
    }
    .area-desc {
        background: #f9fafb;
        border-left: 3px solid #6366f1;
        padding: 3px 10px;
        font-size: 8px;
        color: #6b7280;
        margin-bottom: 4px;
    }

    .metrics-table { width: 100%; border-collapse: collapse; }
    .metrics-table th {
        font-size: 7.5px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: #6b7280;
        text-align: left;
        padding: 4px 8px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
    }
    .metrics-table td {
        padding: 4px 8px;
        border-bottom: 1px solid #f3f4f6;
        font-size: 10px;
        vertical-align: middle;
    }
    .metrics-table tr:last-child td { border-bottom: none; }
    .metrics-table tr:nth-child(even) td { background: #fafafa; }

    .col-name  { width: 38%; color: #374151; }
    .col-val   { width: 16%; font-weight: bold; text-align: right; color: #111827; }
    .col-prev  { width: 16%; text-align: right; color: #9ca3af; }
    .col-bar   { width: 18%; text-align: center; }
    .col-delta { width: 12%; text-align: right; font-weight: bold; font-size: 9px; }
    .th-right  { text-align: right; }
    .th-center { text-align: center; }

    .delta-up   { color: #16a34a; }
    .delta-down { color: #dc2626; }
    .delta-flat { color: #d97706; }
    .delta-none { color: #9ca3af; }

    .no-data { text-align: center; color: #9ca3af; font-style: italic; padding: 10px; font-size: 9px; }
</style>
</head>
<body>

@php
$areaLabels = [
    'awareness' => ['label' => 'Crecimiento de Marca',   'desc' => 'Volumen, alcance y eficiencia de awareness.'],
    'content'   => ['label' => 'Contenido Orgánico',     'desc' => 'Volumen creativo y calidad real por pieza.'],
    'community' => ['label' => 'Comunidad',              'desc' => 'Adquisición, fidelidad y conexión real.'],
    'ads'       => ['label' => 'Performance Ads',        'desc' => 'Inversión y rentabilidad publicitaria.'],
    'system'    => ['label' => 'Eficiencia del Sistema', 'desc' => 'Salud y sustentabilidad del marketing.'],
];

$metricLabels = [
    'impressions_total' => ['label' => 'Impresiones',           'format' => 'number'  ],
    'reach_total'       => ['label' => 'Alcance total',         'format' => 'number'  ],
    'reach_organic'     => ['label' => 'Alcance orgánico',      'format' => 'number'  ],
    'reach_paid'        => ['label' => 'Alcance pago',          'format' => 'number'  ],
    'reel_views'        => ['label' => 'Reproducciones reels',  'format' => 'number'  ],
    'frequency_avg'     => ['label' => 'Frecuencia promedio',   'format' => 'ratio'   ],
    'cost_per_reach'    => ['label' => 'Costo por alcance',     'format' => 'currency'],
    'reels_count'       => ['label' => 'Cantidad de reels',     'format' => 'number'  ],
    'stories_count'     => ['label' => 'Cantidad de stories',   'format' => 'number'  ],
    'posts_count'       => ['label' => 'Cantidad de posts',     'format' => 'number'  ],
    'reach_per_reel'    => ['label' => 'Alcance por reel',      'format' => 'number'  ],
    'shares_avg'        => ['label' => 'Shares promedio',       'format' => 'number'  ],
    'saves_avg'         => ['label' => 'Guardados promedio',    'format' => 'number'  ],
    'comments_avg'      => ['label' => 'Comentarios promedio',  'format' => 'number'  ],
    'engagement_rate'   => ['label' => 'Engagement rate',       'format' => 'percent' ],
    'reels_pct'         => ['label' => '% reels sobre total',   'format' => 'percent' ],
    'virality_relative' => ['label' => 'Viralidad relativa',    'format' => 'ratio'   ],
    'followers_gained'  => ['label' => 'Seguidores ganados',    'format' => 'number'  ],
    'followers_lost'    => ['label' => 'Seguidores perdidos',   'format' => 'number'  ],
    'followers_net'     => ['label' => 'Balance neto',          'format' => 'number'  ],
    'follow_ratio'      => ['label' => 'Ratio follow/unfollow', 'format' => 'ratio'   ],
    'story_replies'     => ['label' => 'Respuestas a stories',  'format' => 'number'  ],
    'dms'               => ['label' => 'DMs generados',         'format' => 'number'  ],
    'growth_efficiency' => ['label' => 'Growth efficiency',     'format' => 'ratio'   ],
    'spend_total'       => ['label' => 'Gasto total',           'format' => 'currency'],
    'roas'              => ['label' => 'ROAS',                  'format' => 'ratio'   ],
    'cpa'               => ['label' => 'CPA',                   'format' => 'currency'],
    'cpc'               => ['label' => 'CPC',                   'format' => 'currency'],
    'ctr'               => ['label' => 'CTR',                   'format' => 'percent' ],
    'conversions'       => ['label' => 'Conversiones',          'format' => 'number'  ],
    'conversion_value'  => ['label' => 'Valor conversiones',    'format' => 'currency'],
    'conversion_rate'   => ['label' => 'Tasa de conversión',    'format' => 'percent' ],
    'cac'               => ['label' => 'CAC',                   'format' => 'currency'],
    'organic_share_pct' => ['label' => '% alcance orgánico',    'format' => 'percent' ],
    'cpm_avg'           => ['label' => 'CPM promedio',          'format' => 'currency'],
    'ctr_avg'           => ['label' => 'CTR promedio',          'format' => 'percent' ],
    'cpc_avg'           => ['label' => 'CPC promedio',          'format' => 'currency'],
    'mer'               => ['label' => 'MER (Fase 2)',          'format' => 'ratio'   ],
];

function fmtVal($v, $f): string {
    if ($v === null) return '—';
    return match($f) {
        'currency' => '$' . number_format($v, 0, ',', '.'),
        'percent'  => number_format($v, 1, ',', '.') . '%',
        'ratio'    => number_format($v, 2, ',', '.'),
        default    => number_format($v, 0, ',', '.'),
    };
}

function deltaClass($d): string {
    if ($d === null) return 'delta-none';
    if ($d > 1)  return 'delta-up';
    if ($d < -1) return 'delta-down';
    return 'delta-flat';
}

function badgeClass($d): string {
    if ($d === null) return 'badge-none';
    if ($d > 1)  return 'badge-up';
    if ($d < -1) return 'badge-down';
    return 'badge-flat';
}

function deltaStr($d): string {
    if ($d === null) return '—';
    return ($d > 0 ? '+' : '') . number_format($d, 1, ',', '.') . '%';
}

// SVG comparison bar: top = current (colored), bottom = previous (gray)
function barSvg($cur, $prev, $delta): string {
    $w = 64; $bh = 5; $gap = 3;
    $max = max(abs((float)($cur ?? 0)), abs((float)($prev ?? 0)));
    if ($max <= 0) $max = 1;
    $cw = $cur  !== null ? (int)min(round(abs($cur)  / $max * $w), $w) : 0;
    $pw = $prev !== null ? (int)min(round(abs($prev) / $max * $w), $w) : 0;
    $color = $delta === null ? '#9ca3af' : ($delta > 1 ? '#16a34a' : ($delta < -1 ? '#ef4444' : '#f59e0b'));
    $h = $bh * 2 + $gap;
    return '<svg width="' . $w . '" height="' . $h . '">'
        . '<rect x="0" y="0"            width="' . $w  . '" height="' . $bh . '" rx="2" fill="#f3f4f6"/>'
        . '<rect x="0" y="0"            width="' . $cw . '" height="' . $bh . '" rx="2" fill="' . $color . '"/>'
        . '<rect x="0" y="' . ($bh + $gap) . '" width="' . $w  . '" height="' . $bh . '" rx="2" fill="#f3f4f6"/>'
        . '<rect x="0" y="' . ($bh + $gap) . '" width="' . $pw . '" height="' . $bh . '" rx="2" fill="#d1d5db"/>'
        . '</svg>';
}

// Summary highlights
$allMetrics = [];
foreach ($metrics as $items) {
    foreach ($items as $row) {
        $allMetrics[$row['metric_key']] = $row;
    }
}
$highlightKeys = ['impressions_total', 'reach_total', 'followers_net', 'engagement_rate', 'spend_total', 'roas'];
$highlights = array_values(array_filter(
    array_map(fn($k) => isset($allMetrics[$k]) && $allMetrics[$k]['value'] !== null
        ? array_merge($allMetrics[$k], ['key' => $k]) : null, $highlightKeys)
));
// chunk into rows of 3
$highlightRows = array_chunk($highlights, 3);
@endphp

{{-- Header --}}
<table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
    <tr>
        <td style="vertical-align:bottom;">
            <div class="brand">Ninjas Studio &middot; Reporte de M&eacute;tricas</div>
            <div class="client-name">{{ $client->name }}</div>
        </td>
        <td style="vertical-align:top; text-align:right;">
            <div class="period-label">{{ $label }}</div>
            <div class="report-subtitle">Generado el {{ now()->format('d/m/Y H:i') }}</div>
        </td>
    </tr>
</table>
<table style="width:100%; border-collapse:collapse; margin-bottom:18px;">
    <tr>
        <td style="border-top:2px solid #111827; font-size:0;">&nbsp;</td>
    </tr>
</table>

{{-- Summary KPI cards --}}
@if(count($highlightRows) > 0)
@foreach($highlightRows as $row)
<table style="width:100%; border-collapse:separate; border-spacing:5px; margin-bottom:2px;">
    <tr>
        @foreach($row as $h)
        @php $def = $metricLabels[$h['key']] ?? ['label' => $h['key'], 'format' => 'number']; @endphp
        <td class="summary-card">
            <div class="summary-card-label">{{ $def['label'] }}</div>
            <div class="summary-card-value">{{ fmtVal($h['value'], $def['format']) }}</div>
            <div><span class="summary-card-delta {{ badgeClass($h['delta_pct']) }}">{{ deltaStr($h['delta_pct']) }}</span></div>
        </td>
        @endforeach
        @for($i = count($row); $i < 3; $i++)
        <td></td>
        @endfor
    </tr>
</table>
@endforeach
<table style="width:100%; border-collapse:collapse; margin-bottom:18px; margin-top:8px;">
    <tr><td style="border-top:1px solid #e5e7eb; font-size:0;">&nbsp;</td></tr>
</table>
@endif

{{-- Areas --}}
@foreach(['awareness','content','community','ads','system'] as $area)
@php
    $items = $metrics[$area] ?? [];
    $meta  = $areaLabels[$area];
@endphp
<div class="area">
    <div class="area-header">{{ $meta['label'] }}</div>
    <div class="area-desc">{{ $meta['desc'] }}</div>

    @if(count($items) === 0)
        <div class="no-data">Sin datos para este per&iacute;odo.</div>
    @else
        <table class="metrics-table">
            <thead>
                <tr>
                    <th class="col-name">M&eacute;trica</th>
                    <th class="col-val th-right">Valor</th>
                    <th class="col-prev th-right">Anterior</th>
                    <th class="col-bar th-center">Tendencia</th>
                    <th class="col-delta th-right">&Delta;%</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $row)
                @php
                    $def   = $metricLabels[$row['metric_key']] ?? ['label' => $row['metric_key'], 'format' => 'number'];
                    $val   = $row['value'];
                    $prev  = $row['previous'];
                    $delta = $row['delta_pct'];
                @endphp
                <tr>
                    <td class="col-name">{{ $def['label'] }}</td>
                    <td class="col-val">{{ fmtVal($val, $def['format']) }}</td>
                    <td class="col-prev">{{ fmtVal($prev, $def['format']) }}</td>
                    <td class="col-bar">{!! barSvg($val, $prev, $delta) !!}</td>
                    <td class="col-delta {{ deltaClass($delta) }}">{{ deltaStr($delta) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</div>
@endforeach

{{-- Footer --}}
<table style="width:100%; border-collapse:collapse; margin-top:20px;">
    <tr>
        <td style="border-top:1px solid #e5e7eb; padding-top:8px; font-size:8px; color:#9ca3af;">
            Ninjas Studio &mdash; Sistema interno
        </td>
        <td style="border-top:1px solid #e5e7eb; padding-top:8px; font-size:8px; color:#9ca3af; text-align:right;">
            {{ $label }} &middot; {{ $client->name }}
        </td>
    </tr>
</table>

</body>
</html>
