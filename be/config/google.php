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
    'oauth2_ads_conversion' => [
        'clientId' => env('GOOGLE_ADS_CONVERSION_CLIENT_ID', env('GOOGLE_ADS_CLIENT_ID')),
        'clientSecret' => env('GOOGLE_ADS_CONVERSION_CLIENT_SECRET', env('GOOGLE_ADS_CLIENT_SECRET')),
        'refreshToken' => env('GOOGLE_ADS_CONVERSION_REFRESH_TOKEN', env('GOOGLE_ADS_REFRESH_TOKEN')),
        'developerToken' => env('GOOGLE_ADS_CONVERSION_DEVELOPER_TOKEN', env('GOOGLE_ADS_DEVELOPER_TOKEN')),
        'loginCustomerId' => env('GOOGLE_ADS_CONVERSION_LOGIN_CUSTOMER_ID', env('GOOGLE_ADS_LOGIN_CUSTOMER_ID')),
    ],
    'scopes' => [
        'analytics' => 'https://www.googleapis.com/auth/analytics.readonly',
    ],
    'default_scopes' => [
        'https://www.googleapis.com/auth/analytics.readonly',
    ],
    'vnd_account_id' => env('ACCOUNT_ID_VND', '[]'),
    'traffic_accounts' => env('TRAFFIC_ACCOUNTS', '[]'),
];
