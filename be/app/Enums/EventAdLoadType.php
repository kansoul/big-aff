<?php

namespace App\Enums;

enum EventAdLoadType: string
{
    case SuccessArticle = 'ads_load_article_success';
    case ErrorArticle = 'ads_load_article_error';
    case SuccessSearch = 'ads_load_search_success';
    case ErrorSearch = 'ads_load_search_error';

    /**
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
