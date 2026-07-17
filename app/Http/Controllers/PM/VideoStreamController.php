<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Concerns\StreamsGoogleDriveVideo;
use App\Http\Controllers\Controller;
use App\Models\ContentPiece;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VideoStreamController extends Controller
{
    use StreamsGoogleDriveVideo;

    public function stream(Request $request, ContentPiece $piece): StreamedResponse
    {
        return $this->streamDriveVideo($request, $piece->final_video_link);
    }
}
