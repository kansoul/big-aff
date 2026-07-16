<?php

namespace App\Actions\TikTok;

use App\Models\TikTokOAuthToken;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Config;
use RuntimeException;

class ExchangeTikTokAuthorizationCodeAction
{
    public function __construct(
        private readonly HttpFactory $http,
    ) {}

    public function execute(string $authorizationCode): TikTokOAuthToken
    {
        $config = Config::array('tiktok.ads');

        foreach (['app_id', 'secret', 'token_endpoint'] as $key) {
            if (empty($config[$key])) {
                throw new RuntimeException("Missing TikTok Ads config: {$key}");
            }
        }
        $response = $this->http
            ->timeout($config['timeout'])
            ->connectTimeout($config['connect_timeout'])
            ->retry(2, 250)
            ->asJson()
            ->post($config['token_endpoint'], [
                'app_id' => $config['app_id'],
                'secret' => $config['secret'],
                'auth_code' => $authorizationCode,
            ])
            ->throw();

        $payload = $response->json();
        $tokenData = $payload['data'] ?? $payload;

        if (($payload['code'] ?? 0) !== 0) {
            $message = $payload['message'] ?? 'TikTok token exchange failed';

            throw new RuntimeException($message);
        }

        if (empty($tokenData['access_token'])) {
            throw new RuntimeException('TikTok token response did not include access_token');
        }

        return TikTokOAuthToken::createOrUpdateFromTikTokResponse($tokenData, $payload);
    }
}
