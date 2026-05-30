<?php

namespace Database\Seeders;

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

        $accesses = [
            // Ana — Café Gourmet BA, FitStore, BellezaNatural
            [$ana->id, 1],
            [$ana->id, 2],
            [$ana->id, 9],
            // Marco — TechHogar, Moda Porteña, Suplementos Pro AR
            [$marco->id, 3],
            [$marco->id, 4],
            [$marco->id, 5],
        ];

        foreach ($accesses as [$userId, $clientId]) {
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
