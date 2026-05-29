<?php

namespace App\Services\Metricool;

class KpiCalculator
{
    public const AREA_AWARENESS = 'awareness';
    public const AREA_CONTENT   = 'content';
    public const AREA_COMMUNITY = 'community';
    public const AREA_ADS       = 'ads';
    public const AREA_SYSTEM    = 'system';

    public function build(MetricoolBundle $bundle): array
    {
        return array_merge(
            $this->awareness($bundle),
            $this->content($bundle),
            $this->community($bundle),
            $this->ads($bundle),
            $this->system($bundle),
        );
    }

    private function awareness(MetricoolBundle $b): array
    {
        $impressions = $b->timelineSum('impressions');
        $organicReach = $b->timelineSum('reach');
        $totalReach   = $organicReach;
        $reelViews    = $b->sumPosts('reels', ['views', 'plays', 'video_views']);

        return [
            ['area' => self::AREA_AWARENESS, 'metric_key' => 'impressions_total', 'value' => $impressions],
            ['area' => self::AREA_AWARENESS, 'metric_key' => 'reach_total',       'value' => $totalReach],
            ['area' => self::AREA_AWARENESS, 'metric_key' => 'reach_organic',     'value' => $organicReach],
            ['area' => self::AREA_AWARENESS, 'metric_key' => 'reach_paid',        'value' => null],
            ['area' => self::AREA_AWARENESS, 'metric_key' => 'reel_views',        'value' => $reelViews],
            ['area' => self::AREA_AWARENESS, 'metric_key' => 'frequency_avg',     'value' => null],
            ['area' => self::AREA_AWARENESS, 'metric_key' => 'cost_per_reach',    'value' => null],
        ];
    }

    private function content(MetricoolBundle $b): array
    {
        $reelsCount   = $b->countPosts('reels');
        // Use igStoriesCount timeline (avoids /stories endpoint that throws 500 intermittently)
        $storiesCount = $b->statsTimelineTotal('igStoriesCount') ?? (float) $b->countPosts('stories');
        $postsCount   = $b->countPosts('posts');
        $totalPosts   = $reelsCount + $storiesCount + $postsCount;

        $reelReach    = $b->sumPosts('reels', ['reach', 'impressions', 'views', 'plays']);
        $reachAvgReel = $reelsCount > 0 ? $reelReach / $reelsCount : 0;

        $sharesAvg     = $b->avgPosts(['posts', 'reels'], ['shares']);
        $savesAvg      = $b->avgPosts(['posts', 'reels'], ['saved', 'saves']);
        $commentsAvg   = $b->avgPosts(['posts', 'reels'], ['comments']);
        $engagementRate = $b->avgPosts(['posts', 'reels'], ['engagement_rate', 'engagement']);

        $shares   = $b->sumPosts(['posts', 'reels'], ['shares']);
        $saves    = $b->sumPosts(['posts', 'reels'], ['saved', 'saves']);
        $virality = $reelReach > 0 ? ($shares + $saves) / $reelReach : 0;

        $reelsPct = $totalPosts > 0 ? ($reelsCount / $totalPosts) * 100 : 0;

        return [
            ['area' => self::AREA_CONTENT, 'metric_key' => 'reels_count',       'value' => $reelsCount],
            ['area' => self::AREA_CONTENT, 'metric_key' => 'stories_count',     'value' => $storiesCount],
            ['area' => self::AREA_CONTENT, 'metric_key' => 'posts_count',       'value' => $postsCount],
            ['area' => self::AREA_CONTENT, 'metric_key' => 'reach_per_reel',    'value' => $reachAvgReel],
            ['area' => self::AREA_CONTENT, 'metric_key' => 'shares_avg',        'value' => $sharesAvg],
            ['area' => self::AREA_CONTENT, 'metric_key' => 'saves_avg',         'value' => $savesAvg],
            ['area' => self::AREA_CONTENT, 'metric_key' => 'comments_avg',      'value' => $commentsAvg],
            ['area' => self::AREA_CONTENT, 'metric_key' => 'engagement_rate',   'value' => $engagementRate],
            ['area' => self::AREA_CONTENT, 'metric_key' => 'reels_pct',         'value' => $reelsPct],
            ['area' => self::AREA_CONTENT, 'metric_key' => 'virality_relative', 'value' => $virality],
        ];
    }

    private function community(MetricoolBundle $b): array
    {
        $followersGained = $b->timelineSum('followers_gained');
        $followersLost   = $b->timelineSum('followers_lost');
        $netDelta        = $b->timelineSum('followers_net');
        $netFollowers    = ($followersGained - $followersLost) + $netDelta;
        $ratio           = $followersLost > 0 ? $followersGained / $followersLost : null;
        $storyReplies    = $b->sumPosts('stories', ['replies']);
        $impressions     = $b->timelineSum('impressions');
        $growthEfficiency = $impressions > 0 ? ($netFollowers / $impressions) * 1000 : 0;

        $igFollowersTotal = $b->statsTimelineTotal('igFollowers');
        $fbFollowersTotal = $b->statsTimelineTotal('facebookLikes');

        return [
            ['area' => self::AREA_COMMUNITY, 'metric_key' => 'ig_followers_total', 'value' => $igFollowersTotal],
            ['area' => self::AREA_COMMUNITY, 'metric_key' => 'fb_followers_total', 'value' => $fbFollowersTotal],
            ['area' => self::AREA_COMMUNITY, 'metric_key' => 'followers_gained',   'value' => $followersGained],
            ['area' => self::AREA_COMMUNITY, 'metric_key' => 'followers_lost',     'value' => $followersLost],
            ['area' => self::AREA_COMMUNITY, 'metric_key' => 'followers_net',      'value' => $netFollowers],
            ['area' => self::AREA_COMMUNITY, 'metric_key' => 'follow_ratio',       'value' => $ratio],
            ['area' => self::AREA_COMMUNITY, 'metric_key' => 'story_replies',      'value' => $storyReplies],
            ['area' => self::AREA_COMMUNITY, 'metric_key' => 'dms',                'value' => null],
            ['area' => self::AREA_COMMUNITY, 'metric_key' => 'growth_efficiency',  'value' => $growthEfficiency],
        ];
    }

    private function ads(MetricoolBundle $b): array
    {
        // Primary source: Facebook Ads via Metricool stats/timeline
        $spend       = $b->statsTimelineTotal('spend');
        $clicks      = $b->statsTimelineTotal('clicks');
        $convValue   = $b->statsTimelineTotal('total_action_value');
        $cpc         = $b->statsTimelineAvg('cpc');
        $cpm         = $b->statsTimelineAvg('cpm');
        $ctr         = $b->statsTimelineAvg('ctr');
        $adsReach    = $b->statsTimelineTotal('reach');

        // Fallback: Google Ads (legacy)
        $g = $b->ads['google'] ?? [];
        if ($spend === null && isset($g['spend'])) {
            $spend = (float) $g['spend'];
        }

        $roas = ($spend !== null && $spend > 0 && $convValue !== null)
            ? round($convValue / $spend, 2)
            : null;

        $cpa = ($spend !== null && $spend > 0 && $clicks !== null && $clicks > 0)
            ? round($spend / $clicks, 2)
            : null;

        $convRate = null;

        return [
            ['area' => self::AREA_ADS, 'metric_key' => 'spend_total',      'value' => $spend],
            ['area' => self::AREA_ADS, 'metric_key' => 'roas',             'value' => $roas],
            ['area' => self::AREA_ADS, 'metric_key' => 'cpa',              'value' => $cpa],
            ['area' => self::AREA_ADS, 'metric_key' => 'cpc',              'value' => $cpc],
            ['area' => self::AREA_ADS, 'metric_key' => 'ctr',              'value' => $ctr],
            ['area' => self::AREA_ADS, 'metric_key' => 'conversions',      'value' => $clicks],
            ['area' => self::AREA_ADS, 'metric_key' => 'conversion_value', 'value' => $convValue],
            ['area' => self::AREA_ADS, 'metric_key' => 'conversion_rate',  'value' => $convRate],
            ['area' => self::AREA_ADS, 'metric_key' => 'cac',              'value' => null],
        ];
    }

    private function system(MetricoolBundle $b): array
    {
        $organicReach = $b->timelineSum('reach');
        $adsReach     = $b->statsTimelineTotal('reach');
        $totalReach   = $organicReach + ($adsReach ?? 0);

        $organicSharePct = $totalReach > 0
            ? round(($organicReach / $totalReach) * 100, 1)
            : null;

        $cpm = $b->statsTimelineAvg('cpm');
        $ctr = $b->statsTimelineAvg('ctr');
        $cpc = $b->statsTimelineAvg('cpc');

        return [
            ['area' => self::AREA_SYSTEM, 'metric_key' => 'organic_share_pct', 'value' => $organicSharePct],
            ['area' => self::AREA_SYSTEM, 'metric_key' => 'cpm_avg',           'value' => $cpm],
            ['area' => self::AREA_SYSTEM, 'metric_key' => 'ctr_avg',           'value' => $ctr],
            ['area' => self::AREA_SYSTEM, 'metric_key' => 'cpc_avg',           'value' => $cpc],
            ['area' => self::AREA_SYSTEM, 'metric_key' => 'mer',               'value' => null],
        ];
    }
}
