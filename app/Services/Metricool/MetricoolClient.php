<?php

namespace App\Services\Metricool;

use Carbon\CarbonInterface;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class MetricoolClient
{
    private const FORMAT_DATE     = 'Ymd'; // swagger specifies YYYYMMDD (no dashes)
    private const FORMAT_DATETIME = 'Y-m-d\TH:i:s';

    private string $baseUrl;
    private string $userId;
    private string $userToken;
    private int $timeout;

    public function __construct()
    {
        $this->baseUrl   = rtrim((string) config('metricool.base_url'), '/');
        $this->userId    = (string) config('metricool.user_id');
        $this->userToken = (string) config('metricool.user_token');
        $this->timeout   = (int) config('metricool.timeout', 30);

        if ($this->userId === '' || $this->userToken === '') {
            throw new RuntimeException('Metricool credentials not configured. Set METRICOOL_USER_ID and METRICOOL_USER_TOKEN.');
        }
    }

    public function listBrands(): array
    {
        return $this->get('/admin/simpleProfiles', []);
    }

    // Returns all metric values for a category on a single day — best for cumulative totals.
    // Categories: instagram, Facebook, fbAdsPerformance, adwordsPerformance, Audience, Contents, Linkedin
    public function statsValues(string $category, string $blogId, CarbonInterface $date): array
    {
        return $this->get('/stats/values/' . $category, [
            'blogId' => $blogId,
            'date'   => $date->format('Ymd'),
        ]);
    }

    // Returns all metrics for a category already aggregated over a date range.
    // Primary source for monthly totals — replaces individual /stats/timeline/{metric} calls.
    public function statsAggregations(string $category, string $blogId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->get('/stats/aggregations/' . $category, [
            'blogId' => $blogId,
            'start'  => $start->format('Ymd'),
            'end'    => $end->format('Ymd'),
        ]);
    }

    public function createReport(string $blogId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->post('/report/create', [
            'userId'                        => $this->userId,
            'blogId'                        => $blogId,
            'brandsummaryCheckbox'          => 'on',
            'brandsummaryPostsCount'        => 5,
            'brandsummaryPostsRankingField' => 'impressions',
            'fbCheckbox'                    => 'on',
            'fbPostsCount'                  => 5,
            'fbRankingField'                => 'impressions',
            'igCheckbox'                    => 'on',
            'igPostsCount'                  => 5,
            'igRankingField'                => 'likes',
            'fbAdsCheckbox'                 => 'on',
            'fbAdsPostsCount'               => 10,
            'fbAdsRankingField'             => 'allConversionsValue',
            'adwordsCheckbox'               => 'on',
            'adwordsPostsCount'             => 10,
            'adwordsRankingField'           => 'allConversionsValue',
            'language'                      => 'es',
            'reportName'                    => 'monthly',
            'offlineMode'                   => true,
            'month'                         => $start->format('Ymd'),
            'from'                          => $start->format('Ymd'),
            'to'                            => $end->format('Ymd'),
            'reportFormat'                  => 'pdf',
            'engineVersion'                 => 'v2',
        ]);
    }

    public function listReports(string $blogId): array
    {
        return $this->get("/v2/brands/{$blogId}/reports", [], appendUserId: false);
    }

    public function getReportStatus(string $blogId, string $jobId): array
    {
        return $this->get("/v2/brands/{$blogId}/reports/{$jobId}", [], appendUserId: false);
    }

    public function instagramPosts(string $blogId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->statsPosts('instagram', $blogId, $start, $end);
    }

    public function instagramReels(string $blogId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->get('/stats/instagram/reels', $this->statsParams($blogId, $start, $end, 200));
    }

    public function instagramStories(string $blogId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->get('/stats/instagram/stories', $this->statsParams($blogId, $start, $end, 500));
    }

    public function statsTimeline(string $metric, string $blogId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->get('/stats/timeline/' . $metric, [
            'blogId' => $blogId,
            'start'  => $start->format('Ymd'),
            'end'    => $end->format('Ymd'),
        ]);
    }

    public function facebookPosts(string $blogId, CarbonInterface $start, CarbonInterface $end): array
    {
        // v1 /stats/facebook/posts returns empty for many accounts; v2 is more reliable
        $result = $this->get('/v2/analytics/posts/facebook', $this->v2Params($blogId, $start, $end, 200));
        if (!empty($result['data'] ?? $result)) {
            return $result;
        }
        return $this->statsPosts('facebook', $blogId, $start, $end);
    }

    public function facebookReels(string $blogId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->get('/v2/analytics/reels/facebook', $this->v2Params($blogId, $start, $end, 200));
    }

    public function facebookStories(string $blogId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->get('/v2/analytics/stories/facebook', $this->v2Params($blogId, $start, $end, 500));
    }

    public function tiktokPosts(string $blogId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->get('/v2/analytics/posts/tiktok', $this->v2Params($blogId, $start, $end, 200));
    }

    public function youtubePosts(string $blogId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->get('/v2/analytics/posts/youtube', $this->v2Params($blogId, $start, $end, 200));
    }

    public function linkedinPosts(string $blogId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->statsPosts('linkedin', $blogId, $start, $end);
    }

    public function twitterPosts(string $blogId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->statsPosts('twitter', $blogId, $start, $end);
    }

    public function timeline(
        string $network,
        string $subject,
        string $metric,
        string $blogId,
        CarbonInterface $start,
        CarbonInterface $end,
    ): array {
        return $this->get('/v2/analytics/timelines', [
            'network' => $network,
            'subject' => $subject,
            'metric'  => $metric,
            'blogId'  => $blogId,
            'from'    => $start->format(self::FORMAT_DATETIME),
            'to'      => $end->format(self::FORMAT_DATETIME),
        ]);
    }

    private function statsPosts(string $network, string $blogId, CarbonInterface $start, CarbonInterface $end): array
    {
        return $this->get("/stats/{$network}/posts", $this->statsParams($blogId, $start, $end, 200));
    }

    private function statsParams(string $blogId, CarbonInterface $start, CarbonInterface $end, int $limit): array
    {
        return [
            'blogId' => $blogId,
            'start'  => $start->format(self::FORMAT_DATE),
            'end'    => $end->format(self::FORMAT_DATE),
            'limit'  => $limit,
        ];
    }

    private function v2Params(string $blogId, CarbonInterface $start, CarbonInterface $end, int $limit): array
    {
        return [
            'blogId' => $blogId,
            'from'   => $start->format(self::FORMAT_DATETIME),
            'to'     => $end->format(self::FORMAT_DATETIME),
            'limit'  => $limit,
        ];
    }

    private function post(string $path, array $data): array
    {
        $url = $this->baseUrl . $path;
        $data['userId'] = $this->userId;

        $response = $this->http()->asForm()->post($url, $data);

        if ($response->successful()) {
            $body = $response->json();
            return is_array($body) ? $body : [];
        }

        $this->logFailure($path, $data, $response);
        return [];
    }

    private function get(string $path, array $query, int $retries = 2, bool $appendUserId = true): array
    {
        $url = $this->baseUrl . $path;
        $params = $appendUserId
            ? array_merge($query, ['userId' => $this->userId])
            : $query;

        $attempt = 0;
        do {
            $response = $this->http()->get($url, $params);

            if ($response->successful()) {
                $data = $response->json();
                return is_array($data) ? $data : [];
            }

            // Only retry on server errors (5xx); client errors (4xx) are final
            if ($response->clientError()) {
                $this->logFailure($path, $params, $response);
                return [];
            }

            $attempt++;
            if ($attempt <= $retries) {
                sleep(2);
            }
        } while ($attempt <= $retries);

        $this->logFailure($path, $params, $response);
        return [];
    }

    private function http(): PendingRequest
    {
        return Http::timeout($this->timeout)
            ->acceptJson()
            ->withHeaders(['X-Mc-Auth' => $this->userToken]);
    }

    private function logFailure(string $path, array $params, Response $response): void
    {
        $context = [
            'path'   => $path,
            'params' => $params,
            'status' => $response->status(),
            'body'   => mb_substr((string) $response->body(), 0, 300),
        ];

        // 5xx = Metricool server error, not our fault — log as info to avoid noise
        if ($response->serverError()) {
            Log::info('Metricool endpoint unavailable (5xx) — skipping', $context);
        } else {
            Log::warning('Metricool API call failed', $context);
        }
    }
}
