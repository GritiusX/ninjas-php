<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ContentPiece;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Http\Response;

class BriefPdfController extends Controller
{
    public function download(ContentPiece $piece): Response
    {
        $piece->load('client', 'editor');

        $pdf = Pdf::loadView('pdf.brief', ['piece' => $piece]);

        $filename = 'brief-' . Str::slug($piece->concept ?? $piece->product ?? (string) $piece->id) . '.pdf';

        return $pdf->download($filename);
    }

    public function downloadClient(Request $request, Client $client): Response
    {
        $request->validate([
            'from'      => ['nullable', 'date'],
            'to'        => ['nullable', 'date'],
            'filter_by' => ['nullable', 'in:created_at,deadline'],
        ]);

        $filterBy = $request->input('filter_by', 'deadline');
        $from     = $request->input('from');
        $to       = $request->input('to');

        $query = $client->contentPieces()->with('editor');

        if ($from) {
            $query->whereDate($filterBy, '>=', $from);
        }

        if ($to) {
            $query->whereDate($filterBy, '<=', $to);
        }

        $pieces = $query->orderBy('deadline')->get();

        $pdf = Pdf::loadView('pdf.brief-client', compact('client', 'pieces', 'from', 'to', 'filterBy'))
            ->setPaper('a4', 'landscape');

        $suffix   = $from || $to ? '-' . ($from ?? '') . '-' . ($to ?? '') : '';
        $filename = 'brief-' . Str::slug($client->name) . $suffix . '.pdf';

        return $pdf->download($filename);
    }
}
