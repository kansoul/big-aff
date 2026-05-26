<?php

namespace App\Services\Integrations\Google;

use Google\Client as GoogleClient;
use Illuminate\Support\Facades\Cache;
use InvalidArgumentException;
use RuntimeException;
use SoapClient;
use SoapHeader;

class GamSoapClientFactory
{
    private const TOKEN_CACHE_KEY = 'gam_service_account_token';

    private const TOKEN_TTL_SECONDS = 55 * 60;

    public function make(string $wsdl): SoapClient
    {
        $accessToken = $this->accessToken();
        $context = stream_context_create([
            'http' => [
                'header' => "Authorization: Bearer {$accessToken}\r\n",
            ],
        ]);

        $client = new SoapClient($wsdl, [
            'exceptions' => true,
            'trace' => false,
            'cache_wsdl' => WSDL_CACHE_MEMORY,
            'stream_context' => $context,
        ]);

        $client->__setSoapHeaders(new SoapHeader($this->namespace(), 'RequestHeader', [
            'networkCode' => $this->configString('network_code'),
            'applicationName' => $this->configString('application_name'),
        ]));

        return $client;
    }

    public function apiVersion(): string
    {
        return $this->configString('api_version');
    }

    public function namespace(): string
    {
        return "https://www.google.com/apis/ads/publisher/{$this->apiVersion()}";
    }

    private function accessToken(): string
    {
        return Cache::remember(self::TOKEN_CACHE_KEY, self::TOKEN_TTL_SECONDS, function (): string {
            return $this->fetchFreshAccessToken();
        });
    }

    private function fetchFreshAccessToken(): string
    {
        $jsonPath = storage_path($this->configString('service_account_json_path'));
        if (! file_exists($jsonPath)) {
            throw new InvalidArgumentException("GAM service account JSON not found at [{$jsonPath}].");
        }

        $client = new GoogleClient;
        $client->setApplicationName($this->configString('application_name'));
        $client->setScopes([$this->configString('scope')]);
        $client->setAuthConfig($jsonPath);

        $token = $client->fetchAccessTokenWithAssertion();

        if (! empty($token['error'])) {
            $message = $token['error_description'] ?? $token['error'];
            throw new RuntimeException("Failed to authenticate Google Ad Manager service account: {$message}");
        }

        $accessToken = $token['access_token'] ?? null;
        if (! is_string($accessToken) || trim($accessToken) === '') {
            throw new RuntimeException('Google Ad Manager service account response did not contain an access token.');
        }

        return $accessToken;
    }

    private function configString(string $key): string
    {
        $value = config("google.ad_manager.{$key}");
        if (! is_string($value) || trim($value) === '') {
            throw new InvalidArgumentException("Missing Google Ad Manager config [google.ad_manager.{$key}].");
        }

        return trim($value);
    }
}
