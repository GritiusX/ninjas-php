<?php

return [
    'user_id'    => env('METRICOOL_USER_ID'),
    'user_token' => env('METRICOOL_USER_TOKEN'),
    'base_url'   => env('METRICOOL_BASE_URL', 'https://app.metricool.com/api'),
    'timeout'    => (int) env('METRICOOL_TIMEOUT', 30),

    // Login por navegador (Symfony Panther) usado solo por /metrics2 para
    // scrapear valores que hoy no expone la API oficial.
    'scrape_email'    => env('METRICOOL_SCRAPE_EMAIL'),
    'scrape_password' => env('METRICOOL_SCRAPE_PASSWORD'),
    'login_url'       => env('METRICOOL_LOGIN_URL', 'https://app.metricool.com/login'),
];
