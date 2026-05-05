<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditController extends Controller
{
    public function index(Request $request): Response
    {
        $logs = AuditLog::with('user')
            ->when($request->action, fn ($q) => $q->where('action', 'like', "%{$request->action}%"))
            ->when($request->user_id, fn ($q) => $q->where('user_id', $request->user_id))
            ->orderByDesc('created_at')
            ->paginate(50);

        return Inertia::render('admin/audit', [
            'logs' => $logs,
            'filters' => $request->only(['action', 'user_id']),
        ]);
    }
}
