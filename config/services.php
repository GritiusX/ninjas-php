<?php

return [

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel'              => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model'   => env('GEMINI_MODEL', 'gemini-2.0-flash'),
    ],

    'whatsapp' => [
        'token'                => env('WHATSAPP_TOKEN'),
        'phone_number_id'      => env('WHATSAPP_PHONE_NUMBER_ID'),
        'webhook_verify_token' => env('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
    ],

    'google_ads' => [
        'developer_token'    => env('GOOGLE_ADS_DEVELOPER_TOKEN'),
        'client_id'          => env('GOOGLE_ADS_CLIENT_ID'),
        'client_secret'      => env('GOOGLE_ADS_CLIENT_SECRET'),
        'refresh_token'      => env('GOOGLE_ADS_REFRESH_TOKEN'),
        'login_customer_id'  => env('GOOGLE_ADS_LOGIN_CUSTOMER_ID'), // MCC si aplica
        'api_version'        => env('GOOGLE_ADS_API_VERSION', 'v18'),
    ],

    'meta_ads' => [
        'app_id'       => env('META_ADS_APP_ID'),
        'app_secret'   => env('META_ADS_APP_SECRET'),
        'access_token' => env('META_ADS_ACCESS_TOKEN'),
        'api_version'  => env('META_ADS_API_VERSION', 'v19.0'),
    ],

    'google_drive' => [
        'service_account_path' => env('GOOGLE_DRIVE_SERVICE_ACCOUNT_PATH'),
        'root_folder_id'       => env('GOOGLE_DRIVE_ROOT_FOLDER_ID'),
    ],

];
