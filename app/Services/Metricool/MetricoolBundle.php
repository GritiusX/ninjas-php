<?php

namespace App\Services\Metricool;

class MetricoolBundle
{
    public array $timelines = [];
    public array $posts = [];
    public array $reels = [];
    public array $stories = [];
    public array $ads = [];

    public function timelineSum(string $bucket): float
    {
        $total = 0.0;
        foreach ($this->timelines as $networkBuckets) {
            foreach ($networkBuckets[$bucket] ?? [] as $row) {
                $total += $this->extract($row, ['value', 'count', $bucket]);
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
