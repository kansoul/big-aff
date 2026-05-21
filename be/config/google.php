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
    // Google Adsense
    'application_name' => env('GOOGLE_APPLICATION_NAME', 'Laravel Google API'),
    'oauth2_adsense' => [
        'client_id' => env('GOOGLE_ADSENSE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_ADSENSE_CLIENT_SECRET'),
        'refresh_token' => env('GOOGLE_ADSENSE_REFRESH_TOKEN'),
    ],
    // Google Ad Manager / AdX reporting
    'ad_manager' => [
        'api_version' => env('GOOGLE_AD_MANAGER_API_VERSION', 'v202605'),
        'network_code' => env('GOOGLE_AD_MANAGER_NETWORK_CODE'),
        'application_name' => env('GOOGLE_AD_MANAGER_APPLICATION_NAME', env('GOOGLE_APPLICATION_NAME', 'Laravel Google API')),
        'service_account_json_path' => env('GOOGLE_AD_MANAGER_SERVICE_ACCOUNT_JSON_PATH'),
        'scope' => env('GOOGLE_AD_MANAGER_SCOPE', 'https://www.googleapis.com/auth/dfp'),
        'poll_interval_seconds' => env('GOOGLE_AD_MANAGER_REPORT_POLL_INTERVAL_SECONDS', 2),
        'poll_attempts' => env('GOOGLE_AD_MANAGER_REPORT_POLL_ATTEMPTS', 30),
    ],
    'scopes' => [
        'adsense' => 'https://www.googleapis.com/auth/adsense.readonly',
        'analytics' => 'https://www.googleapis.com/auth/analytics.readonly',
        'ad_manager' => 'https://www.googleapis.com/auth/dfp',
    ],
    'default_scopes' => [
        'https://www.googleapis.com/auth/adsense.readonly',
        'https://www.googleapis.com/auth/analytics.readonly',
    ],
    'vnd_account_id' => env('ACCOUNT_ID_VND', '[]'),
    'traffic_accounts' => env('TRAFFIC_ACCOUNTS', '[]'),
];
