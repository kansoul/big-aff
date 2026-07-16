<?php

use App\Http\Controllers\TikTokOAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/tiktok/callback', TikTokOAuthController::class)
    ->name('tiktok.callback');
