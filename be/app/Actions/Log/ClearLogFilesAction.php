<?php

namespace App\Actions\Log;

class ClearLogFilesAction
{
    /**
     * Clear all log files.
     */
    public function execute(): void
    {
        $dir = storage_path('logs');
        $pattern = $dir.'/*.log';
        $paths = glob($pattern) ?: [];

        foreach ($paths as $path) {
            file_put_contents($path, '');
        }
    }
}
