<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TemporaryAccessSeeder extends Seeder
{
    public function run(): void
    {
        $ana   = User::where('email', 'ana@littleninjas.com.ar')->first();
        $marco = User::where('email', 'marco@littleninjas.com.ar')->first();
        $admin = User::where('email', 'admin@littleninjas.com.ar')->first();

        $clientId = fn(string $name) => Client::where('name', $name)->value('id');

        $accesses = [
            // Ana — Café Gourmet BA, FitStore, BellezaNatural
            [$ana->id, $clientId('Café Gourmet BA')],
            [$ana->id, $clientId('FitStore Argentina')],
            [$ana->id, $clientId('BellezaNatural AR')],
            // Marco — TechHogar, Moda Porteña, Suplementos Pro AR
            [$marco->id, $clientId('TechHogar')],
            [$marco->id, $clientId('Moda Porteña')],
            [$marco->id, $clientId('Suplementos Pro AR')],
        ];

        foreach (array_filter($accesses, fn($a) => $a[0] && $a[1]) as [$userId, $clientId]) {
            $exists = DB::table('temporary_access')
                ->where('user_id', $userId)
                ->where('client_id', $clientId)
                ->exists();

            if (! $exists) {
                DB::table('temporary_access')->insert([
                    'user_id'    => $userId,
                    'client_id'  => $clientId,
                    'granted_by' => $admin->id,
                    'expires_at' => null,
                    'created_at' => now(),
                ]);
            }
        }
    }
}
