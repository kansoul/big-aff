<?php

return [
    'ads' => [
        'app_id' => env('TIKTOK_ADS_APP_ID'),
        'secret' => env('TIKTOK_ADS_SECRET'),
        'token_endpoint' => env('TIKTOK_ADS_TOKEN_ENDPOINT', 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/'),
        'timeout' => (int) env('TIKTOK_ADS_TIMEOUT', 60),
        'connect_timeout' => (int) env('TIKTOK_ADS_CONNECT_TIMEOUT', 5),
    ],
];
