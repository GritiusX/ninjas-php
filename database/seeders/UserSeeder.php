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
            ['name' => 'Gonzalo',    'email' => 'gonzalo@littleninjas.com.ar',    'role' => 'admin'],
            ['name' => 'Giuseppe',   'email' => 'giuseppe@littleninjas.com.ar',   'role' => 'admin'],
            ['name' => 'Manuel',     'email' => 'manuel@littleninjas.com.ar',     'role' => 'admin'],
            ['name' => 'Felipe',     'email' => 'felipe@littleninjas.com.ar',     'role' => 'editor'],
            ['name' => 'Matias',     'email' => 'matias@littleninjas.com.ar',     'role' => 'paid_pauta'],
            ['name' => 'Santiago',   'email' => 'santiago@littleninjas.com.ar',   'role' => 'paid_pauta'],
            ['name' => 'Diseñadora', 'email' => 'disenadora@littleninjas.com.ar', 'role' => 'diseño'],
            ['name' => 'AM',         'email' => 'am@littleninjas.com.ar',         'role' => 'redes'],
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
