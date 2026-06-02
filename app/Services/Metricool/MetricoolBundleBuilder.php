<?php

namespace App\Services\Metricool;

use Carbon\CarbonInterface;

class MetricoolBundleBuilder
{
    private const STATS_TIMELINE_METRICS = [
        // Instagram account totals (cumulative — use statsTimelineLast, not sum)
        'igFollowers',         // total Instagram followers
        'igFollowing',         // total following
        // Instagram daily aggregates (use statsTimelineTotal / sum)
        'igStoriesCount',      // daily stories count (avoids /stories 500 error)
        'igDeltaFollowers',    // daily follower change (positive = gain, negative = loss)
        'igEngagement',        // engagement total
        'igSaved',             // guardados totales
        'igLikes',             // likes totales
        'igComments',          // comentarios totales
        'igPostsReach',        // alcance de posts
        'igPostsImpressions',  // impresiones de posts
        'igStoriesReach',      // alcance de stories
        'igStoriesImpressions', // impresiones de stories
        'igwebsite_clicks',    // clicks al bio link
        // Facebook page (cumulative)
        'facebookLikes',       // total Facebook followers/likes
        // Facebook daily
        'fbFollows',           // daily Facebook follows
        'fbUnfollows',         // daily Facebook unfollows
        // Facebook Ads via Metricool stats
        'spend',
        'clicks',
        'cpc',
        'cpm',
        'ctr',
        'total_action_value',
        'reach',
        'impressions',
        'unique_clicks',
        'unique_ctr',
    ];

    // Only metrics confirmed valid for /v2/analytics/timelines per Metricool docs.
    // Instagram account-level impressions/reach are NOT available on this endpoint.
    private const TIMELINE_METRICS = [
        'facebook' => [
            ['subject' => 'account', 'metric' => 'pageImpressions', 'bucket' => 'impressions'],
            ['subject' => 'account', 'metric' => 'Follows',         'bucket' => 'followers_gained'],
            ['subject' => 'account', 'metric' => 'Unfollows',       'bucket' => 'followers_lost'],
        ],
    ];

    public function __construct(private MetricoolClient $client)
    {
    }

    public function build(string $blogId, CarbonInterface $start, CarbonInterface $end): MetricoolBundle
    {
        $bundle = new MetricoolBundle();

        $bundle->posts['instagram']    = $this->rows($this->client->instagramPosts($blogId, $start, $end));
        $bundle->reels['instagram']    = $this->rows($this->client->instagramReels($blogId, $start, $end));
        // /stats/instagram/stories returns 500 consistently — count comes from igStoriesCount timeline instead

        $bundle->posts['facebook']    = $this->rows($this->client->facebookPosts($blogId, $start, $end));
        $bundle->reels['facebook']    = $this->rows($this->client->facebookReels($blogId, $start, $end));
        $bundle->stories['facebook']  = $this->rows($this->client->facebookStories($blogId, $start, $end));

        foreach (self::TIMELINE_METRICS as $network => $configs) {
            foreach ($configs as $cfg) {
                $payload = $this->client->timeline(
                    network: $network,
                    subject: $cfg['subject'],
                    metric:  $cfg['metric'],
                    blogId:  $blogId,
                    start:   $start,
                    end:     $end,
                );
                $rows = $this->rows($payload);
                if ($rows !== []) {
                    $bundle->timelines[$network][$cfg['bucket']] = $rows;
                }
            }
        }

        foreach (self::STATS_TIMELINE_METRICS as $metric) {
            $rows = $this->rows($this->client->statsTimeline($metric, $blogId, $start, $end));
            if ($rows !== []) {
                $bundle->statsTimelines[$metric] = $rows;
            }
        }

        return $bundle;
    }

    private function rows(array $payload): array
    {
        if (isset($payload['data']) && is_array($payload['data'])) {
            return $payload['data'];
        }
        if (isset($payload['items']) && is_array($payload['items'])) {
            return $payload['items'];
        }
        if (isset($payload['timeline']) && is_array($payload['timeline'])) {
            return $payload['timeline'];
        }
        if ($payload === []) {
            return [];
        }
        return array_is_list($payload) ? $payload : [$payload];
    }
}
