<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Pixel\ListPixelsRequest;
use App\Http\Requests\Pixel\StorePixelRequest;
use App\Http\Requests\Pixel\UpdatePixelRequest;
use App\Http\Resources\PixelResource;
use App\Models\Pixel;
use App\Services\Pixel\PixelService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class PixelController extends BaseController
{
    public function __construct(private readonly PixelService $service) {}

    public function index(ListPixelsRequest $request): JsonResponse
    {
        $paginator = $this->service->list($request->validated());

        return $this->sendResponse(['data' => PixelResource::collection($paginator->items()), 'pagination' => $this->parsePagination($paginator)]);
    }

    public function store(StorePixelRequest $request): JsonResponse
    {
        return $this->sendResponse(['data' => new PixelResource($this->service->create($request->validated()))], Response::HTTP_CREATED);
    }

    public function update(UpdatePixelRequest $request, Pixel $pixel): JsonResponse
    {
        return $this->sendResponse(['data' => new PixelResource($this->service->update($pixel, $request->validated()))]);
    }

    public function destroy(Pixel $pixel): JsonResponse
    {
        $this->service->delete($pixel);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }
}
