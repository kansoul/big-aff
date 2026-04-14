<?php

return [
    // Google Ads
    'developerToken' => env('GOOGLE_ADS_DEVELOPER_TOKEN'),
    'loginCustomerId' => env('GOOGLE_ADS_LOGIN_CUSTOMER_ID'),
    'oauth2_ads' => [
        'clientId' => env('GOOGLE_ADS_CLIENT_ID'),
        'clientSecret' => env('GOOGLE_ADS_CLIENT_SECRET'),
        'refreshToken' => env('GOOGLE_ADS_REFRESH_TOKEN'),
    ],
    // Google Adsense
    'application_name' => env('GOOGLE_APPLICATION_NAME', 'Laravel Google API'),
    'oauth2_adsense' => [
        'client_id' => env('GOOGLE_ADSENSE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_ADSENSE_CLIENT_SECRET'),
        'refresh_token' => env('GOOGLE_ADSENSE_REFRESH_TOKEN'),
    ],
    'scopes' => [
        'adsense' => 'https://www.googleapis.com/auth/adsense.readonly',
        'analytics' => 'https://www.googleapis.com/auth/analytics.readonly',
    ],
    'default_scopes' => [
        'https://www.googleapis.com/auth/adsense.readonly',
        'https://www.googleapis.com/auth/analytics.readonly',
    ],
    'vnd_account_id' => env('ACCOUNT_ID_VND', '[]'),
    'traffic_accounts' => env('TRAFFIC_ACCOUNTS', '[]'),
];
