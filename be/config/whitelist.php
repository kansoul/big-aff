<?php

return [
    'ip' => explode(',', env('IP_WHITELIST', '')),
    'domain' => explode(',', env('DOMAIN_WHITELIST', '')),
    'enabled' => env('WHITELIST_ENABLED', false),

    /*
     * Public key the landing page snippet must send as `key` on every tracking
     * request. Leave empty to accept requests without a key.
     */
    'tracking_key' => env('TRACKING_PUBLIC_KEY', ''),
];
