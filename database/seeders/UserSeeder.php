<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Admin',
            'email' => 'admin@littleninjas.com.ar',
            'password' => Hash::make('ninja123'),
            'role' => 'admin',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        User::create([
            'name' => 'PM Ninja',
            'email' => 'pm@littleninjas.com.ar',
            'password' => Hash::make('ninja123'),
            'role' => 'pm',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        User::create([
            'name' => 'Ana Editora',
            'email' => 'ana@littleninjas.com.ar',
            'password' => Hash::make('ninja123'),
            'role' => 'editor',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }
}
