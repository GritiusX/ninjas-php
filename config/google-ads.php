<?php

return [
    'developer_token' => env('GOOGLE_ADS_DEVELOPER_TOKEN'),
    'client_id'       => env('GOOGLE_ADS_CLIENT_ID'),
    'client_secret'   => env('GOOGLE_ADS_CLIENT_SECRET'),
    'refresh_token'   => env('GOOGLE_ADS_REFRESH_TOKEN'),
    'login_customer_id' => env('GOOGLE_ADS_LOGIN_CUSTOMER_ID'), // MCC ID sin guiones
    'redirect_uri'    => env('GOOGLE_ADS_REDIRECT_URI', 'https://ninjas.on-forge.com/google-ads/callback'),
];
