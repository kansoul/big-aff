<?php

namespace App\Console\Commands\CampaignRule;

use App\Models\Campaign;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateCampaignApplyRuleSourceableIdCommand extends Command
{
    protected $signature = 'campaign-rule:migrate-sourceable-id
                            {--dry-run : Hiển thị kết quả mà không thực sự update DB}
                            {--chunk=500 : Số bản ghi xử lý mỗi batch}';

    protected $description = 'Cập nhật campaign_apply_rules.sourceable_id từ campaigns.id sang campaigns.campaign_id';

    public function handle(): int
    {
        $isDryRun = (bool) $this->option('dry-run');
        $chunkSize = (int) $this->option('chunk');

        $sourceableType = Campaign::class;

        $total = DB::table('campaign_apply_rules')
            ->where('sourceable_type', $sourceableType)
            ->count();

        if ($total === 0) {
            $this->info('Không có bản ghi Campaign nào trong campaign_apply_rules.');

            return self::SUCCESS;
        }

        $this->info("Tổng số bản ghi cần xử lý: {$total}");

        if ($isDryRun) {
            $this->comment('[dry-run] Không thực hiện update DB.');
        }

        $updated = 0;
        $skipped = 0;
        $notFound = 0;

        DB::table('campaign_apply_rules')
            ->where('sourceable_type', $sourceableType)
            ->orderBy('id')
            ->chunk($chunkSize, function ($rows) use ($isDryRun, &$updated, &$skipped, &$notFound) {
                $oldIds = $rows->pluck('sourceable_id')->unique()->values()->all();

                $campaigns = Campaign::whereIn('id', $oldIds)
                    ->select('id', 'campaign_id')
                    ->get()
                    ->keyBy('id');

                foreach ($rows as $row) {
                    $campaign = $campaigns->get($row->sourceable_id);

                    if (! $campaign) {
                        $this->warn("  [skip] apply_rule id={$row->id}: không tìm thấy campaign với id={$row->sourceable_id}");
                        $notFound++;

                        continue;
                    }

                    $newSourceableId = (int) $campaign->campaign_id;

                    if ($newSourceableId === (int) $row->sourceable_id) {
                        $skipped++;

                        continue;
                    }

                    if (! $isDryRun) {
                        $exists = DB::table('campaign_apply_rules')
                            ->where('sourceable_type', $row->sourceable_type)
                            ->where('sourceable_id', $newSourceableId)
                            ->where('campaign_rule_id', $row->campaign_rule_id)
                            ->where('id', '!=', $row->id)
                            ->exists();

                        if ($exists) {
                            DB::table('campaign_apply_rules')->where('id', $row->id)->delete();
                        } else {
                            DB::table('campaign_apply_rules')
                                ->where('id', $row->id)
                                ->update(['sourceable_id' => $newSourceableId]);
                        }
                    }

                    $updated++;
                }
            });

        $this->newLine();
        $this->table(
            ['Trạng thái', 'Số lượng'],
            [
                ['Đã update', $updated],
                ['Bỏ qua (id trùng)', $skipped],
                ['Không tìm thấy campaign', $notFound],
            ],
        );

        if ($isDryRun) {
            $this->comment('[dry-run] Bỏ --dry-run để chạy thật.');
        } else {
            $this->info('Hoàn tất.');
        }

        return self::SUCCESS;
    }
}
