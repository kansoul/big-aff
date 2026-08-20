<?php

namespace App\Http\Controllers\Api;

use App\Actions\Link\CreateLinkAction;
use App\Actions\Link\DeleteLinkAction;
use App\Actions\Link\ListLinksAction;
use App\Actions\Link\UpdateLinkAction;
use App\Http\Requests\Link\ListLinksRequest;
use App\Http\Requests\Link\StoreLinkRequest;
use App\Http\Requests\Link\UpdateLinkRequest;
use App\Http\Resources\LinkResource;
use App\Models\Link;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class LinkController extends BaseController
{
    public function index(ListLinksRequest $request, ListLinksAction $action): JsonResponse
    {
        $paginator = $action->execute($request->validated());

        return $this->sendResponse(['data' => LinkResource::collection($paginator->items()), 'pagination' => $this->parsePagination($paginator)]);
    }

    public function store(StoreLinkRequest $request, CreateLinkAction $action): JsonResponse
    {
        return $this->sendResponse(['data' => new LinkResource($action->execute($request->validated()))], Response::HTTP_CREATED);
    }

    public function show(Link $link): JsonResponse
    {
        return $this->sendResponse(['data' => new LinkResource($link)]);
    }

    public function update(UpdateLinkRequest $request, Link $link, UpdateLinkAction $action): JsonResponse
    {
        return $this->sendResponse(['data' => new LinkResource($action->execute($link, $request->validated()))]);
    }

    public function destroy(Link $link, DeleteLinkAction $action): JsonResponse
    {
        $action->execute($link);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }
}
