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
        $felipe = User::where('email', 'felipe@littleninjas.com')->first();
        $admin  = User::where('email', 'gonzalo@littleninjas.com')->first();

        $clientId = fn(string $name) => Client::where('name', $name)->value('id');

        $accesses = [
            [$felipe->id, $clientId('Aura Natural')],
            [$felipe->id, $clientId('FitStore Argentina')],
            [$felipe->id, $clientId('BellezaNatural AR')],
            [$felipe->id, $clientId('TechHogar')],
            [$felipe->id, $clientId('Moda Porteña')],
            [$felipe->id, $clientId('Suplementos Pro AR')],
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
