<?php

$file = __DIR__ . '/../vendor/googleads/googleads-php-lib/src/Google/AdsApi/Common/AdsSoapClient.php';

if (!file_exists($file)) {
    echo "Skipped: googleads-php-lib not installed.\n";
    exit(0);
}

$content = file_get_contents($file);

// Fix 1: nullable array in constructor
$content = str_replace(
    'public function __construct($wsdl, array $options = null)',
    'public function __construct($wsdl, ?array $options = null)',
    $content
);

// Fix 2: __doRequest signature for PHP 8.5
$content = preg_replace(
    '/#\[\\\\ReturnTypeWillChange\]\s+public function __doRequest\(\s*\$request,\s*\$location,\s*\$action,\s*\$version,\s*\$one_way = 0\s*\)/s',
    'public function __doRequest(string $request, string $location, string $action, int $version, bool $one_way = false, ?string $uriParserClass = null): ?string',
    $content
);

// Fix 3: nullable SoapFault
$content = str_replace(
    'private function logSoapCall($methodName, SoapFault $soapFault = null)',
    'private function logSoapCall($methodName, ?SoapFault $soapFault = null)',
    $content
);

// Fix 4: pass uriParserClass to parent::__doRequest
$content = str_replace(
    'parent::__doRequest($request, $location, $action, $version, $one_way)',
    'parent::__doRequest($request, $location, $action, $version, $one_way, $uriParserClass)',
    $content
);

file_put_contents($file, $content);
echo "Patched AdsSoapClient for PHP 8.5 compatibility.\n";
