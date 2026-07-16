<?php

namespace App\Http\Controllers;

use App\Actions\TikTok\ExchangeTikTokAuthorizationCodeAction;
use App\Http\Requests\TikTokOAuthCallbackRequest;
use Illuminate\Http\JsonResponse;
use Throwable;

class TikTokOAuthController extends Controller
{
    public function __invoke(
        TikTokOAuthCallbackRequest $request,
        ExchangeTikTokAuthorizationCodeAction $exchangeTikTokAuthorizationCode,
    ): JsonResponse {
        if ($request->filled('error')) {
            return response()->json([
                'success' => false,
                'message' => $request->string('error_description')->toString() ?: $request->string('error')->toString(),
                'state' => $request->validated('state'),
            ], 400);
        }

        try {
            $token = $exchangeTikTokAuthorizationCode->execute($request->authorizationCode());
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
                'state' => $request->validated('state'),
            ], 502);
        }

        return response()->json([
            'success' => true,
            'message' => 'TikTok Ads token connected successfully.',
            'data' => [
                'token_id' => $token->id,
                'advertiser_ids' => $token->advertiser_ids ?? [],
                'expires_at' => $token->expires_at?->toISOString(),
                'refresh_token_expires_at' => $token->refresh_token_expires_at?->toISOString(),
            ],
            'state' => $request->validated('state'),
        ]);
    }
}
