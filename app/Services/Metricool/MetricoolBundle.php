<?php

namespace App\Services\Metricool;

class MetricoolBundle
{
    public array $timelines = [];
    public array $posts = [];
    public array $reels = [];
    public array $stories = [];
    public array $ads = [];
    public array $statsTimelines = []; // keyed by metric name, from /stats/timeline/{metric}

    public function statsTimelineTotal(string $metric): ?float
    {
        $rows = $this->statsTimelines[$metric] ?? [];
        if (empty($rows)) {
            return null;
        }
        $total = 0.0;
        foreach ($rows as $row) {
            $total += $this->parseStatsRow($row, $metric);
        }
        return $total;
    }

    // Returns the last value in the series — correct for cumulative metrics like igFollowers.
    public function statsTimelineLast(string $metric): ?float
    {
        $rows = $this->statsTimelines[$metric] ?? [];
        if (empty($rows)) {
            return null;
        }
        $val = $this->parseStatsRow(end($rows), $metric);
        return $val > 0 ? $val : null;
    }

    // Sum of only positive daily values (e.g. follower gains from delta series).
    public function statsTimelineGains(string $metric): float
    {
        $total = 0.0;
        foreach ($this->statsTimelines[$metric] ?? [] as $row) {
            $val = $this->parseStatsRow($row, $metric);
            if ($val > 0) {
                $total += $val;
            }
        }
        return $total;
    }

    // Sum of absolute values of negative daily values (e.g. follower losses from delta series).
    public function statsTimelineLosses(string $metric): float
    {
        $total = 0.0;
        foreach ($this->statsTimelines[$metric] ?? [] as $row) {
            $val = $this->parseStatsRow($row, $metric);
            if ($val < 0) {
                $total += abs($val);
            }
        }
        return $total;
    }

    public function statsTimelineAvg(string $metric): ?float
    {
        $rows = $this->statsTimelines[$metric] ?? [];
        if (empty($rows)) {
            return null;
        }
        $sum = 0.0;
        $count = 0;
        foreach ($rows as $row) {
            $val = $this->parseStatsRow($row, $metric);
            if ($val > 0) {
                $sum += $val;
                $count++;
            }
        }
        return $count > 0 ? $sum / $count : null;
    }

    public function timelineSum(string $bucket): float
    {
        $total = 0.0;
        foreach ($this->timelines as $networkBuckets) {
            foreach ($networkBuckets[$bucket] ?? [] as $row) {
                // /v2/analytics/timelines wraps the value inside aggregate.value
                if (isset($row['aggregate']['value']) && is_numeric($row['aggregate']['value'])) {
                    $total += (float) $row['aggregate']['value'];
                } else {
                    $total += $this->extract($row, ['value', 'count', $bucket]);
                }
            }
        }
        return $total;
    }

    public function countPosts(string|array $kind): int
    {
        $bag = $this->kindBag($kind);
        $count = 0;
        foreach ($bag as $rows) {
            $count += is_array($rows) ? count($rows) : 0;
        }
        return $count;
    }

    public function sumPosts(string|array $kind, array $keys): float
    {
        $bag = $this->kindBag($kind);
        $total = 0.0;
        foreach ($bag as $rows) {
            foreach ($rows as $row) {
                $total += $this->extract($row, $keys);
            }
        }
        return $total;
    }

    public function avgPosts(string|array $kind, array $keys): float
    {
        $bag = $this->kindBag($kind);
        $sum = 0.0;
        $count = 0;
        foreach ($bag as $rows) {
            foreach ($rows as $row) {
                $sum += $this->extract($row, $keys);
                $count++;
            }
        }
        return $count > 0 ? $sum / $count : 0.0;
    }

    private function kindBag(string|array $kind): array
    {
        if (is_array($kind)) {
            $merged = [];
            foreach ($kind as $k) {
                $merged = array_merge($merged, $this->kindBag($k));
            }
            return $merged;
        }

        return match ($kind) {
            'reels'   => $this->reels,
            'stories' => $this->stories,
            'posts'   => $this->posts,
            default   => [],
        };
    }

    // /stats/timeline/{metric} returns [["YYYYMMDD", "value"], ...] — value at index 1.
    private function parseStatsRow(mixed $row, string $metric): float
    {
        if (is_array($row) && isset($row[1]) && is_numeric($row[1])) {
            return (float) $row[1];
        }
        if (is_array($row)) {
            return $this->extract($row, ['value', 'count', 'total', $metric]);
        }
        return 0.0;
    }

    private function extract(array $row, array $keys): float
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $row) && is_numeric($row[$key])) {
                return (float) $row[$key];
            }
        }
        return 0.0;
    }
}
