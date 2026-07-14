<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\ContentPiece;
use App\Services\GoogleDriveService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VideoStreamController extends Controller
{
    public function stream(Request $request, ContentPiece $piece): StreamedResponse
    {
        if (!$piece->final_video_link) {
            abort(404);
        }

        preg_match('/\/d\/([a-zA-Z0-9_-]+)/', $piece->final_video_link, $matches);
        $fileId = $matches[1] ?? null;

        if (!$fileId) {
            abort(404);
        }

        $drive    = new GoogleDriveService();
        $meta     = $drive->getFileMetadata($fileId);
        $mimeType = $meta->getMimeType() ?: 'video/mp4';
        $fileSize = (int) $meta->getSize();

        $start = 0;
        $end   = $fileSize - 1;
        $status = 200;
        $headers = [
            'Content-Type'              => $mimeType,
            'Accept-Ranges'             => 'bytes',
            'Content-Disposition'       => 'inline',
            'Cache-Control'             => 'private, max-age=3600',
        ];

        // Handle Range requests so the browser can seek
        if ($request->hasHeader('Range')) {
            preg_match('/bytes=(\d+)-(\d*)/', $request->header('Range'), $range);
            $start  = (int) $range[1];
            $end    = isset($range[2]) && $range[2] !== '' ? (int) $range[2] : $fileSize - 1;
            $status = 206;
            $headers['Content-Range']  = "bytes {$start}-{$end}/{$fileSize}";
            $headers['Content-Length'] = $end - $start + 1;
        } else {
            $headers['Content-Length'] = $fileSize;
        }

        return response()->stream(function () use ($drive, $fileId) {
            $response = $drive->streamFile($fileId);
            $body     = $response->getBody();

            while (!$body->eof()) {
                echo $body->read(1024 * 256);
                flush();
            }
        }, $status, $headers);
    }
}
