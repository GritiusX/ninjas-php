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

    /* Header */
    .header {
        border-bottom: 2px solid #111827;
        padding-bottom: 14px;
        margin-bottom: 20px;
    }
    .header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }
    .brand {
        font-size: 9px;
        font-weight: bold;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #6b7280;
    }
    .client-name {
        font-size: 22px;
        font-weight: bold;
        color: #111827;
        margin-top: 4px;
    }
    .period-label {
        font-size: 12px;
        color: #6366f1;
        font-weight: bold;
        text-align: right;
        text-transform: capitalize;
    }
    .report-subtitle {
        font-size: 9px;
        color: #9ca3af;
        text-align: right;
        margin-top: 2px;
    }

    /* Area section */
    .area {
        margin-bottom: 22px;
        page-break-inside: avoid;
    }
    .area-header {
        background: #111827;
        color: #fff;
        padding: 6px 12px;
        font-size: 9px;
        font-weight: bold;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        margin-bottom: 0;
    }
    .area-desc {
        background: #f9fafb;
        border-left: 3px solid #6366f1;
        padding: 4px 10px;
        font-size: 8px;
        color: #6b7280;
        margin-bottom: 6px;
    }

    /* Metrics table */
    .metrics-table {
        width: 100%;
        border-collapse: collapse;
    }
    .metrics-table th {
        font-size: 8px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #6b7280;
        text-align: left;
        padding: 4px 8px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
    }
    .metrics-table th.right { text-align: right; }
    .metrics-table td {
        padding: 5px 8px;
        border-bottom: 1px solid #f3f4f6;
        font-size: 10px;
    }
    .metrics-table tr:last-child td { border-bottom: none; }
    .metrics-table tr:nth-child(even) td { background: #fafafa; }

    .metric-name { color: #374151; }
    .metric-value { font-weight: bold; text-align: right; color: #111827; }
    .metric-prev { text-align: right; color: #9ca3af; }
    .metric-delta { text-align: right; font-weight: bold; }
    .delta-up   { color: #16a34a; }
    .delta-down { color: #dc2626; }
    .delta-flat { color: #d97706; }
    .delta-none { color: #9ca3af; }

    .no-data {
        text-align: center;
        color: #9ca3af;
        font-style: italic;
        padding: 12px;
        font-size: 9px;
    }

    /* Footer */
    .footer {
        margin-top: 28px;
        padding-top: 10px;
        border-top: 1px solid #e5e7eb;
        font-size: 8px;
        color: #9ca3af;
        display: flex;
        justify-content: space-between;
    }
</style>
</head>
<body>

@php
use Illuminate\Support\Number;

$areaLabels = [
    'awareness'  => ['label' => 'Crecimiento de Marca',    'desc' => 'Volumen, alcance y eficiencia de awareness.'],
    'content'    => ['label' => 'Contenido Orgánico',      'desc' => 'Volumen creativo y calidad real por pieza.'],
    'community'  => ['label' => 'Comunidad',               'desc' => 'Adquisición, fidelidad y conexión real.'],
    'ads'        => ['label' => 'Performance Ads',         'desc' => 'Inversión y rentabilidad publicitaria.'],
    'system'     => ['label' => 'Eficiencia del Sistema',  'desc' => 'Salud y sustentabilidad del marketing.'],
];

$metricLabels = [
    'impressions_total'   => ['label' => 'Impresiones',            'format' => 'number'  ],
    'reach_total'         => ['label' => 'Alcance total',          'format' => 'number'  ],
    'reach_organic'       => ['label' => 'Alcance orgánico',       'format' => 'number'  ],
    'reach_paid'          => ['label' => 'Alcance pago',           'format' => 'number'  ],
    'reel_views'          => ['label' => 'Reproducciones reels',   'format' => 'number'  ],
    'frequency_avg'       => ['label' => 'Frecuencia promedio',    'format' => 'ratio'   ],
    'cost_per_reach'      => ['label' => 'Costo por alcance',      'format' => 'currency'],
    'reels_count'         => ['label' => 'Cantidad de reels',      'format' => 'number'  ],
    'stories_count'       => ['label' => 'Cantidad de stories',    'format' => 'number'  ],
    'posts_count'         => ['label' => 'Cantidad de posts',      'format' => 'number'  ],
    'reach_per_reel'      => ['label' => 'Alcance por reel',       'format' => 'number'  ],
    'shares_avg'          => ['label' => 'Shares promedio',        'format' => 'number'  ],
    'saves_avg'           => ['label' => 'Guardados promedio',     'format' => 'number'  ],
    'comments_avg'        => ['label' => 'Comentarios promedio',   'format' => 'number'  ],
    'engagement_rate'     => ['label' => 'Engagement rate',        'format' => 'percent' ],
    'reels_pct'           => ['label' => '% reels sobre total',    'format' => 'percent' ],
    'virality_relative'   => ['label' => 'Viralidad relativa',     'format' => 'ratio'   ],
    'followers_gained'    => ['label' => 'Seguidores ganados',     'format' => 'number'  ],
    'followers_lost'      => ['label' => 'Seguidores perdidos',    'format' => 'number'  ],
    'followers_net'       => ['label' => 'Balance neto',           'format' => 'number'  ],
    'follow_ratio'        => ['label' => 'Ratio follow/unfollow',  'format' => 'ratio'   ],
    'story_replies'       => ['label' => 'Respuestas a stories',   'format' => 'number'  ],
    'dms'                 => ['label' => 'DMs generados',          'format' => 'number'  ],
    'growth_efficiency'   => ['label' => 'Growth efficiency',      'format' => 'ratio'   ],
    'spend_total'         => ['label' => 'Gasto total',            'format' => 'currency'],
    'roas'                => ['label' => 'ROAS',                   'format' => 'ratio'   ],
    'cpa'                 => ['label' => 'CPA',                    'format' => 'currency'],
    'cpc'                 => ['label' => 'CPC',                    'format' => 'currency'],
    'ctr'                 => ['label' => 'CTR',                    'format' => 'percent' ],
    'conversions'         => ['label' => 'Conversiones',           'format' => 'number'  ],
    'conversion_value'    => ['label' => 'Valor conversiones',     'format' => 'currency'],
    'conversion_rate'     => ['label' => 'Tasa de conversión',     'format' => 'percent' ],
    'cac'                 => ['label' => 'CAC',                    'format' => 'currency'],
    'organic_share_pct'   => ['label' => '% alcance orgánico',     'format' => 'percent' ],
    'cpm_avg'             => ['label' => 'CPM promedio',           'format' => 'currency'],
    'ctr_avg'             => ['label' => 'CTR promedio',           'format' => 'percent' ],
    'cpc_avg'             => ['label' => 'CPC promedio',           'format' => 'currency'],
    'mer'                 => ['label' => 'MER (Fase 2)',           'format' => 'ratio'   ],
];

function fmtVal($value, $format): string {
    if ($value === null || (is_float($value) && is_nan($value))) return '—';
    return match($format) {
        'currency' => '$' . number_format($value, 0, ',', '.'),
        'percent'  => number_format($value, 1, ',', '.') . '%',
        'ratio'    => number_format($value, 2, ',', '.'),
        default    => number_format($value, 0, ',', '.'),
    };
}

function deltaClass($delta): string {
    if ($delta === null) return 'delta-none';
    if ($delta > 1)  return 'delta-up';
    if ($delta < -1) return 'delta-down';
    return 'delta-flat';
}

function deltaStr($delta): string {
    if ($delta === null) return '—';
    $prefix = $delta > 0 ? '+' : '';
    return $prefix . number_format($delta, 1, ',', '.') . '%';
}
@endphp

{{-- Header --}}
<div class="header">
    <table class="header-top" style="width:100%;">
        <tr>
            <td>
                <div class="brand">Ninjas Studio · Reporte de Métricas</div>
                <div class="client-name">{{ $client->name }}</div>
            </td>
            <td style="text-align:right; vertical-align:top;">
                <div class="period-label">{{ $label }}</div>
                <div class="report-subtitle">Generado el {{ now()->format('d/m/Y H:i') }}</div>
            </td>
        </tr>
    </table>
</div>

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
        <div class="no-data">Sin datos para este período.</div>
    @else
        <table class="metrics-table">
            <thead>
                <tr>
                    <th style="width:50%">Métrica</th>
                    <th class="right" style="width:20%">Valor</th>
                    <th class="right" style="width:18%">Mes anterior</th>
                    <th class="right" style="width:12%">Δ%</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $row)
                @php
                    $def    = $metricLabels[$row['metric_key']] ?? ['label' => $row['metric_key'], 'format' => 'number'];
                    $val    = $row['value'];
                    $prev   = $row['previous'];
                    $delta  = $row['delta_pct'];
                @endphp
                <tr>
                    <td class="metric-name">{{ $def['label'] }}</td>
                    <td class="metric-value">{{ fmtVal($val, $def['format']) }}</td>
                    <td class="metric-prev">{{ fmtVal($prev, $def['format']) }}</td>
                    <td class="metric-delta {{ deltaClass($delta) }}">{{ deltaStr($delta) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</div>
@endforeach

{{-- Footer --}}
<div class="footer">
    <span>Ninjas Studio — Sistema interno</span>
    <span>{{ $label }} · {{ $client->name }}</span>
</div>

</body>
</html>
