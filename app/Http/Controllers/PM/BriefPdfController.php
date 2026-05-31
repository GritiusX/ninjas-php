<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ContentPiece;
use Barryvdh\DomPDF\Facade\Pdf;
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

    public function downloadClient(Client $client): Response
    {
        $pieces = $client->contentPieces()->with('editor')->orderBy('deadline')->get();

        $pdf = Pdf::loadView('pdf.brief-client', compact('client', 'pieces'))
            ->setPaper('a4', 'landscape');

        $filename = 'brief-' . Str::slug($client->name) . '.pdf';

        return $pdf->download($filename);
    }
}
