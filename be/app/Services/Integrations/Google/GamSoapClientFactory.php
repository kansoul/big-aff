<?php

namespace App\Services\Integrations\Google;

use Google\AdsApi\AdManager\AdManagerServices;
use Google\AdsApi\AdManager\AdManagerSession;
use Google\AdsApi\AdManager\AdManagerSessionBuilder;
use Google\AdsApi\Common\OAuth2TokenBuilder;
use InvalidArgumentException;

class GamSoapClientFactory
{
    private ?AdManagerSession $session = null;

    private AdManagerServices $services;

    public function __construct()
    {
        $this->services = new AdManagerServices;
    }

    /**
     * @template T
     *
     * @param  class-string<T>  $serviceClass
     * @return T
     */
    public function make(string $serviceClass): mixed
    {
        return $this->services->get($this->session(), $serviceClass);
    }

    public function session(): AdManagerSession
    {
        if ($this->session === null) {
            $jsonPath = storage_path($this->configString('service_account_json_path'));
            if (! file_exists($jsonPath)) {
                throw new InvalidArgumentException("GAM service account JSON not found at [{$jsonPath}].");
            }

            $oAuth2Credential = (new OAuth2TokenBuilder)
                ->withJsonKeyFilePath($jsonPath)
                ->withScopes($this->configString('scope'))
                ->build();

            $this->session = (new AdManagerSessionBuilder)
                ->withNetworkCode($this->configString('network_code'))
                ->withApplicationName($this->configString('application_name'))
                ->withOAuth2Credential($oAuth2Credential)
                ->build();
        }

        return $this->session;
    }

    public function apiVersion(): string
    {
        return $this->configString('api_version');
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
