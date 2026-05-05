<?php

return [
    'is_main' => (bool) env('MAIN_SYSTEM_IS_MAIN', false),

    'api_url' => env('MAIN_SYSTEM_API_URL'),
    'main_team_id' => env('MAIN_SYSTEM_MAIN_TEAM_ID'),
    'token' => env('MAIN_SYSTEM_TOKEN'),

    'timeout' => (int) env('MAIN_SYSTEM_HTTP_TIMEOUT', 15),
    'connect_timeout' => (int) env('MAIN_SYSTEM_HTTP_CONNECT_TIMEOUT', 5),
];
