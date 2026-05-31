<?php

namespace App\Services\Metricool;

use Carbon\CarbonInterface;

class MetricoolBundleBuilder
{
    private const STATS_TIMELINE_METRICS = [
        // Instagram
        'igStoriesCount',   // replaces /stats/instagram/stories for count
        'igFollowers',      // total Instagram followers (acumulado)
        'igFollowing',      // total following
        'igEngagement',     // engagement total
        'igSaved',          // guardados totales
        'igLikes',          // likes totales
        'igComments',       // comentarios totales
        'igPostsReach',     // alcance de posts
        'igPostsImpressions', // impresiones de posts
        'igStoriesReach',   // alcance de stories
        'igStoriesImpressions', // impresiones de stories
        'igwebsite_clicks', // clicks al bio link
        // Facebook page
        'facebookLikes',    // total Facebook followers/likes
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

    private const TIMELINE_METRICS = [
        'instagram' => [
            ['subject' => 'account', 'metric' => 'impressions',     'bucket' => 'impressions'],
            ['subject' => 'account', 'metric' => 'reach',           'bucket' => 'reach'],
            ['subject' => 'account', 'metric' => 'delta_followers', 'bucket' => 'followers_net'],
            ['subject' => 'account', 'metric' => 'profile_views',   'bucket' => 'profile_views'],
        ],
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
        $bundle->stories['instagram']  = $this->rows($this->client->instagramStories($blogId, $start, $end));

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
