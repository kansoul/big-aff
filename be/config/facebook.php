<?php

return [
    'facebook_default' => [
        'app_id' => env('FACEBOOK_APP_ID'),
        'app_secret' => env('FACEBOOK_APP_SECRET'),
        'access_token' => env('FACEBOOK_ACCESS_TOKEN'),
    ],

    'facebook_ads' => [
        'access_token' => env('FACEBOOK_ADS_ACCESS_TOKEN'),
        'app_secret' => env('FACEBOOK_ADS_APP_SECRET'),
        'app_id' => env('FACEBOOK_ADS_APP_ID'),
    ],

    'facebook_ads_update' => [
        'access_token' => env('FACEBOOK_ADS_UPDATE_ACCESS_TOKEN'),
        'app_secret' => env('FACEBOOK_ADS_UPDATE_APP_SECRET'),
        'app_id' => env('FACEBOOK_ADS_UPDATE_APP_ID'),
    ],

    'facebook_sync_tokens' => [
        'app_id' => env('FACEBOOK_SYNC_APP_ID'),
        'app_secret' => env('FACEBOOK_SYNC_APP_SECRET'),
        'access_token' => env('FACEBOOK_SYNC_ACCESS_TOKEN'),
    ],

    'facebook_special_token' => [
        'app_id' => env('FACEBOOK_SPECIAL_APP_ID'),
        'app_secret' => env('FACEBOOK_SPECIAL_APP_SECRET'),
        'access_token' => env('FACEBOOK_SPECIAL_ACCESS_TOKEN'),
    ],
];
