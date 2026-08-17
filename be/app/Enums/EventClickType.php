<?php

namespace App\Enums;

enum EventClickType: string
{
    case Redirect = 'redirect';
    case Lead = 'lead';
}
