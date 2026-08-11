// Mini gráfico de línea sin dependencias externas — no hay ninguna librería de
// charts instalada en el proyecto, y para una polyline de ~30 puntos no hace
// falta agregar una.
export type SparklinePoint = { date: string; value: number };

function buildPolyline(points: SparklinePoint[], width: number, height: number, padding: number): string {
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;

    return points
        .map((p, i) => {
            const x = padding + (points.length === 1 ? innerWidth / 2 : (i / (points.length - 1)) * innerWidth);
            const y = padding + innerHeight - ((p.value - min) / range) * innerHeight;

            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
}

export function Sparkline({
    points,
    color,
    width = 64,
    height = 22,
}: {
    points: SparklinePoint[];
    color: string;
    width?: number;
    height?: number;
}) {
    if (points.length < 2) {
        return null;
    }

    const padding = Math.max(2, height * 0.12);

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden="true">
            <polyline
                points={buildPolyline(points, width, height, padding)}
                fill="none"
                stroke={color}
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
