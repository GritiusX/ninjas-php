<?php

namespace App\Services\Metricool;

use Carbon\CarbonInterface;

class MetricoolBundleBuilder
{
    // Full confirmed list from /stats/timeline/{metric} swagger docs.
    private const STATS_TIMELINE_METRICS = [
        // Instagram — cumulative totals (use statsTimelineLast)
        'igFollowers',          // total followers
        'igFollowing',          // total following
        // Instagram — daily sums (use statsTimelineTotal)
        'igimpressions',        // all-content impressions (posts + stories + reels)
        'igreach',              // all-content reach
        'igDeltaFollowers',     // daily follower delta (+gain / -loss)
        'igStoriesCount',       // daily stories published
        'igPosts',              // daily posts published (static)
        'igEngagement',
        'igSaved',
        'igLikes',
        'igComments',
        'igPostsReach',
        'igPostsImpressions',
        'igStoriesReach',
        'igStoriesImpressions',
        'igwebsite_clicks',
        'igprofile_views',
        // Facebook page — cumulative total (use statsTimelineLast)
        'facebookLikes',        // total page followers/likes
        // Facebook page — daily sums
        'fbPosts',              // daily posts published
        'pageImpressions',      // total page impressions (= "Visualizaciones" in Metricool)
        'pageViews',            // page visits (= "Visitas a página" in Metricool)
        'dailyImpressions',     // daily organic impressions
        'fbFollows',            // daily page follows
        'fbUnfollows',          // daily page unfollows
        // Facebook Ads
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

    // /v2/analytics/timelines is only used where stats/timeline has no equivalent.
    // FB followers gained/lost: fbFollows/fbUnfollows via stats timeline as primary,
    // timeline endpoint as secondary (kept for accounts that have it).
    private const TIMELINE_METRICS = [
        'facebook' => [
            ['subject' => 'account', 'metric' => 'Follows',   'bucket' => 'followers_gained'],
            ['subject' => 'account', 'metric' => 'Unfollows', 'bucket' => 'followers_lost'],
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

        // Daily snapshot for the last day of the period — best source for cumulative totals
        // (followers, page likes) since timeline values can be 0 for some accounts.
        foreach (['instagram', 'Facebook', 'fbAdsPerformance', 'Contents'] as $category) {
            $vals = $this->client->statsValues($category, $blogId, $end);
            if (!empty($vals)) {
                $bundle->dailyValues[$category] = $vals;
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
