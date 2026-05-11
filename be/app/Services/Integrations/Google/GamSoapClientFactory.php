<?php

namespace App\Services\Integrations\Google;

use Google\Client as GoogleClient;
use Illuminate\Support\Facades\Cache;
use InvalidArgumentException;
use RuntimeException;
use SoapClient;
use SoapHeader;

/**
 * Creates authenticated GAM SOAP clients and caches the service-account access token
 * for 55 minutes so every request doesn't trigger a round-trip to Google's auth endpoint.
 * Token is stored in the application cache (database-backed by default).
 */
class GamSoapClientFactory
{
    private const TOKEN_CACHE_KEY = 'gam_service_account_token';

    private const TOKEN_TTL_SECONDS = 55 * 60;

    /**
     * Build a SOAP client for the given GAM service WSDL and attach the
     * standard RequestHeader (network code + application name).
     */
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

        $version = $this->configString('api_version');
        $namespace = "https://www.google.com/apis/ads/publisher/{$version}";

        $client->__setSoapHeaders(new SoapHeader($namespace, 'RequestHeader', [
            'networkCode' => $this->configString('network_code'),
            'applicationName' => $this->configString('application_name'),
        ]));

        return $client;
    }

    /**
     * Return the GAM API version string (e.g. "v202511").
     */
    public function apiVersion(): string
    {
        return $this->configString('api_version');
    }

    /**
     * Return the GAM namespace for the configured API version.
     */
    public function namespace(): string
    {
        $version = $this->apiVersion();

        return "https://www.google.com/apis/ads/publisher/{$version}";
    }

    /**
     * Fetch a cached access token, or obtain a fresh one from Google and store it.
     */
    private function accessToken(): string
    {
        return Cache::remember(self::TOKEN_CACHE_KEY, self::TOKEN_TTL_SECONDS, function (): string {
            return $this->fetchFreshAccessToken();
        });
    }

    private function fetchFreshAccessToken(): string
    {
        $client = new GoogleClient;
        $client->setApplicationName($this->configString('application_name'));
        $client->setScopes([$this->configString('scope')]);

        $jsonPath = storage_path(config('google.ad_manager.service_account_json_path'));
        if (! is_string($jsonPath) || trim($jsonPath) === '') {
            throw new InvalidArgumentException('Missing Google Ad Manager config [google.ad_manager.service_account_json_path].');
        }
        $client->setAuthConfig(trim($jsonPath));

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
