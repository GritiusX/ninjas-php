<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class HelpController extends Controller
{
    private const MANUALS = [
        'editor' => 'editor.pdf',
        'pm' => 'pm.pdf',
        'admin' => 'admin.pdf',
        'superadmin' => 'admin.pdf',
    ];

    public function manual(Request $request): BinaryFileResponse
    {
        $file = self::MANUALS[$request->user()->role] ?? null;

        abort_if($file === null, 404);

        return response()->file(resource_path('help/' . $file), [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="manual.pdf"',
        ]);
    }
}
