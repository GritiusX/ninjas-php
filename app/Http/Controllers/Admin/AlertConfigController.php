<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AlertConfig;
use App\Models\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AlertConfigController extends Controller
{
    public function index(): Response
    {
        $this->ensureDefaultsExist();

        $clients = Client::orderBy('name')->get(['id', 'name', 'roas_goal']);

        $globalConfigs = AlertConfig::whereNull('client_id')
            ->get()
            ->keyBy('alert_type')
            ->map(fn ($c) => $this->formatConfig($c));

        $clientConfigs = AlertConfig::whereNotNull('client_id')
            ->get()
            ->groupBy('client_id')
            ->map(fn ($group) => $group->keyBy('alert_type')->map(fn ($c) => $this->formatConfig($c)));

        return Inertia::render('admin/alerts', [
            'clients'       => $clients,
            'globalConfigs' => $globalConfigs,
            'clientConfigs' => $clientConfigs,
        ]);
    }

    public function update(Request $request, AlertConfig $alertConfig): RedirectResponse
    {
        $data = $request->validate([
            'is_enabled'      => ['boolean'],
            'threshold_value' => ['nullable', 'numeric', 'min:0'],
            'notify_admin'    => ['boolean'],
            'notify_pm'       => ['boolean'],
        ]);

        $alertConfig->update($data);

        return back()->with('success', 'Alerta actualizada.');
    }

    private function formatConfig(AlertConfig $config): array
    {
        return [
            'id'              => $config->id,
            'alert_type'      => $config->alert_type,
            'client_id'       => $config->client_id,
            'is_enabled'      => $config->is_enabled,
            'threshold_value' => $config->threshold_value,
            'notify_admin'    => $config->notify_admin,
            'notify_pm'       => $config->notify_pm,
        ];
    }

    private function ensureDefaultsExist(): void
    {
        // Global alerts
        foreach (AlertConfig::GLOBAL_TYPES as $type) {
            AlertConfig::firstOrCreate(
                ['alert_type' => $type, 'client_id' => null],
                [
                    'is_enabled'      => true,
                    'threshold_value' => AlertConfig::DEFAULTS[$type],
                    'notify_admin'    => true,
                    'notify_pm'       => true,
                ]
            );
        }

        // Per-client alerts
        $clients = Client::all('id');
        foreach ($clients as $client) {
            foreach (AlertConfig::CLIENT_TYPES as $type) {
                AlertConfig::firstOrCreate(
                    ['alert_type' => $type, 'client_id' => $client->id],
                    [
                        'is_enabled'      => true,
                        'threshold_value' => AlertConfig::DEFAULTS[$type],
                        'notify_admin'    => true,
                        'notify_pm'       => true,
                    ]
                );
            }
        }
    }
}
