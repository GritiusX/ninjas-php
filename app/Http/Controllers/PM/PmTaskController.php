<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Concerns\HandlesPieceTask;
use App\Http\Controllers\Controller;
use App\Services\NotificationService;
use App\Services\WhatsAppService;

class PmTaskController extends Controller
{
    use HandlesPieceTask;

    protected string $taskPage = 'pm/task';

    public function __construct(
        private NotificationService $notifications,
        private WhatsAppService $whatsapp,
    ) {}
}
