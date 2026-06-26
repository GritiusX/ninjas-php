<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ContentPiece;
use App\Services\Metricool\MetricoolClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use RuntimeException;

class MetricoolScheduleController extends Controller
{
    private const NETWORK_LABELS = [
        'instagram'     => 'Instagram',
        'facebook'      => 'Facebook',
        'tiktok'        => 'TikTok',
        'twitter'       => 'X (Twitter)',
        'linkedinCompany' => 'LinkedIn',
        'youtube'       => 'YouTube',
        'threads'       => 'Threads',
        'pinterest'     => 'Pinterest',
    ];

    public function __construct(private MetricoolClient $metricool) {}

    public function networks(ContentPiece $piece): JsonResponse
    {
        $piece->load('client');

        $blogId = (int) ($piece->client?->metricool_blog_id ?? 0);
        if (!$blogId) {
            return response()->json(['error' => 'Este cliente no tiene blogId de Metricool configurado.'], 422);
        }

        $brands = $this->metricool->listBrands();
        $brand  = collect($brands)->first(fn($b) => (int)($b['id'] ?? 0) === $blogId);

        if (!$brand) {
            return response()->json(['error' => 'Marca no encontrada en Metricool para este cliente.'], 404);
        }

        $networks = [];
        foreach (self::NETWORK_LABELS as $key => $label) {
            $id = $brand[$key] ?? '';
            // Skip empty/placeholder values
            if ($id && $id !== 'string' && strlen(trim($id)) > 0) {
                $networks[] = ['network' => $key, 'id' => (string) $id, 'label' => $label];
            }
        }

        return response()->json([
            'networks'   => $networks,
            'copy_text'  => $this->resolveChosenCopy($piece),
            'video_link' => $piece->final_video_link,
        ]);
    }

    public function schedule(Request $request, ContentPiece $piece): RedirectResponse
    {
        $request->validate([
            'providers'         => ['required', 'array', 'min:1'],
            'providers.*.network' => ['required', 'string'],
            'providers.*.id'      => ['required', 'string'],
            'date_time'         => ['required', 'string'],
            'timezone'          => ['required', 'string'],
            'text'              => ['required', 'string', 'max:5000'],
            'draft'             => ['nullable', 'boolean'],
            'media'             => ['nullable', 'array'],
            'media.*'           => ['string'],
        ]);

        $piece->load('client');

        $blogId = (int) ($piece->client?->metricool_blog_id ?? 0);
        if (!$blogId) {
            return back()->with('error', 'Este cliente no tiene blogId de Metricool configurado.');
        }

        try {
            $this->metricool->schedulePost(
                blogId:   $blogId,
                providers: $request->input('providers'),
                dateTime:  $request->input('date_time'),
                timezone:  $request->input('timezone'),
                text:      $request->input('text'),
                draft:     (bool) $request->boolean('draft'),
                media:     $request->input('media', []),
            );
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $piece->update(['status' => ContentPiece::STATUS_PUBLISHED]);

        AuditLog::create([
            'user_id'     => $request->user()->id,
            'action'      => 'content.scheduled_metricool',
            'entity_type' => 'content_piece',
            'entity_id'   => $piece->id,
            'payload'     => [
                'client'    => $piece->client->name,
                'networks'  => collect($request->input('providers'))->pluck('network')->join(', '),
                'draft'     => $request->boolean('draft'),
                'date_time' => $request->input('date_time'),
            ],
            'ip' => $request->ip(),
        ]);

        $mode = $request->boolean('draft') ? 'borrador' : 'publicación programada';
        return redirect()->route('pm.dashboard')->with('success', "Post enviado a Metricool como {$mode}.");
    }

    private function resolveChosenCopy(ContentPiece $piece): ?string
    {
        if (!$piece->client_chosen_copy || !$piece->generated_copy) {
            return null;
        }
        return $piece->generated_copy[$piece->client_chosen_copy] ?? null;
    }
}
