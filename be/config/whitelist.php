<?php

return [
    'ip' => explode(',', env('IP_WHITELIST', '')),
    'domain' => explode(',', env('DOMAIN_WHITELIST', '')),
    'enabled' => env('WHITELIST_ENABLED', false),
];
