<?php

use Illuminate\Support\Facades\Http;

if (! function_exists('getVndToUsdRate')) {
    function getVndToUsdRate(): float
    {
        try {
            $response = Http::get('https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx');

            if (! $response->ok()) {
                return 0.0;
            }

            $body = $response->body();
            if (! $body) {
                return 0.0;
            }

            $xml = @simplexml_load_string($body);
            if ($xml === false) {
                return 0.0;
            }

            if (! isset($xml->Exrate)) {
                return 0.0;
            }

            foreach ($xml->Exrate as $exrate) {
                if ((string) $exrate['CurrencyCode'] === 'USD') {
                    $buy = (string) $exrate['Buy'];
                    $normalized = (float) str_replace(',', '', $buy);

                    return $normalized > 0 ? $normalized : 0.0;
                }
            }

            return 0.0;
        } catch (Exception $e) {
            return 0.0;
        }
    }
}
