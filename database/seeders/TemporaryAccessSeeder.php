<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TemporaryAccessSeeder extends Seeder
{
    public function run(): void
    {
        $ana = User::where('email', 'ana@littleninjas.com.ar')->first();
        $admin = User::where('email', 'admin@littleninjas.com.ar')->first();

        // Ana tiene acceso permanente a Café Gourmet BA (client_id=1)
        DB::table('temporary_access')->insert([
            'user_id' => $ana->id,
            'client_id' => 1,
            'granted_by' => $admin->id,
            'expires_at' => null,
            'created_at' => now(),
        ]);

        // Ana tiene acceso permanente a FitStore Argentina (client_id=2)
        DB::table('temporary_access')->insert([
            'user_id' => $ana->id,
            'client_id' => 2,
            'granted_by' => $admin->id,
            'expires_at' => null,
            'created_at' => now(),
        ]);
    }
}
