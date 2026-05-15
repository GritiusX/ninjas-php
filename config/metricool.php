<?php

return [
    'user_id'    => env('METRICOOL_USER_ID'),
    'user_token' => env('METRICOOL_USER_TOKEN'),
    'base_url'   => env('METRICOOL_BASE_URL', 'https://app.metricool.com/api'),
    'timeout'    => (int) env('METRICOOL_TIMEOUT', 30),
];
