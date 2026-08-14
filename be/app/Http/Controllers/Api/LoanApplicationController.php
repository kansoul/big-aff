<?php

namespace App\Http\Controllers\Api;

use App\Actions\LoanApplication\CreateLoanApplicationAction;
use App\Actions\LoanApplication\UpdateLoanApplicationAction;
use App\Http\Requests\LoanApplication\StoreLoanApplicationRequest;
use App\Http\Requests\LoanApplication\UpdateLoanApplicationRequest;
use App\Http\Resources\LoanApplicationResource;
use App\Models\LoanApplication;
use Illuminate\Http\JsonResponse;

class LoanApplicationController extends BaseController
{
    public function store(StoreLoanApplicationRequest $request, CreateLoanApplicationAction $action): JsonResponse
    {
        $application = $action->execute($request->validated());

        return $this->sendResponse(['data' => new LoanApplicationResource($application)], 201);
    }

    public function show(LoanApplication $loanApplication): JsonResponse
    {
        return $this->sendResponse(['data' => new LoanApplicationResource($loanApplication)]);
    }

    public function update(
        UpdateLoanApplicationRequest $request,
        LoanApplication $loanApplication,
        UpdateLoanApplicationAction $action,
    ): JsonResponse {
        $data = $request->validated();
        unset($data['completed']);
        if ($request->boolean('completed')) {
            $data['completed_at'] = now();
        }
        $application = $action->execute($loanApplication, $data);

        return $this->sendResponse(['data' => new LoanApplicationResource($application)]);
    }
}
