<?php

namespace App\Actions\LoanApplication;

use App\Models\LoanApplication;

class UpdateLoanApplicationAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(LoanApplication $loanApplication, array $data): LoanApplication
    {
        $loanApplication->update($data);

        return $loanApplication->refresh();
    }
}
