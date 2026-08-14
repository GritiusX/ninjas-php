<?php

namespace App\Console\Commands;

use App\Models\ContentPiece;
use Illuminate\Console\Command;

class FixStuckBriefStatus extends Command
{
    protected $signature = 'briefs:fix-stuck-status {--apply : Apply the fix instead of just listing affected rows}';

    protected $description = 'Fix briefs left in BRIEF status despite having an editor assigned (bug activo entre el 16 jul y el 8 ago 2026)';

    public function handle(): int
    {
        $pieces = ContentPiece::with('client')
            ->where('status', ContentPiece::STATUS_BRIEF)
            ->whereNotNull('assigned_editor_id')
            ->get();

        if ($pieces->isEmpty()) {
            $this->info('No hay briefs atascados en status BRIEF con editor asignado.');

            return self::SUCCESS;
        }

        $this->table(
            ['ID', 'Cliente', 'Concepto', 'Editor asignado'],
            $pieces->map(fn (ContentPiece $p) => [
                $p->id,
                $p->client?->name,
                $p->concept ?? $p->product ?? '—',
                $p->assigned_editor_id,
            ]),
        );

        if (! $this->option('apply')) {
            $this->comment(sprintf('%d brief(s) afectados. Corré con --apply para pasarlos a EDITING.', $pieces->count()));

            return self::SUCCESS;
        }

        $count = ContentPiece::where('status', ContentPiece::STATUS_BRIEF)
            ->whereNotNull('assigned_editor_id')
            ->update(['status' => ContentPiece::STATUS_EDITING]);

        $this->info("{$count} brief(s) actualizados a EDITING.");

        return self::SUCCESS;
    }
}
