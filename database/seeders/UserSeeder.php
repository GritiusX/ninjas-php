<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['name' => 'Gonzalo',    'email' => 'gonzalo@littleninjas.com',    'role' => 'admin'],
            ['name' => 'Giuseppe',   'email' => 'giuseppe@littleninjas.com',   'role' => 'admin'],
            ['name' => 'Manuel',     'email' => 'manuel@littleninjas.com',     'role' => 'admin'],
            ['name' => 'Felipe',     'email' => 'felipe@littleninjas.com',     'role' => 'editor'],
            ['name' => 'Matias',     'email' => 'matias@littleninjas.com',     'role' => 'paid_pauta'],
            ['name' => 'Santiago',   'email' => 'santiago@littleninjas.com',   'role' => 'paid_pauta'],
            ['name' => 'Diseñadora', 'email' => 'disenadora@littleninjas.com', 'role' => 'diseño'],
            ['name' => 'AM',         'email' => 'am@littleninjas.com',         'role' => 'redes'],
        ];

        foreach ($users as $u) {
            User::firstOrCreate(['email' => $u['email']], [
                'name'                  => $u['name'],
                'password'              => Hash::make('Ninjas2025!'),
                'role'                  => $u['role'],
                'is_active'             => true,
                'email_verified_at'     => now(),
            ]);
        }
    }
}
