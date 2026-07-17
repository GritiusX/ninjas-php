<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\StreamsGoogleDriveVideo;
use App\Models\ContentPiece;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PublicMediaController extends Controller
{
    use StreamsGoogleDriveVideo;

    // Unauthenticated — gated by the piece's review_token, same trust model as the public review page.
    public function video(Request $request, string $token): StreamedResponse
    {
        $piece = ContentPiece::where('review_token', $token)->firstOrFail();

        return $this->streamDriveVideo($request, $piece->final_video_link);
    }
}
