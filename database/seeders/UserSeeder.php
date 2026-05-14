<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(['email' => 'admin@littleninjas.com.ar'], [
            'name' => 'Admin',
            'password' => Hash::make('ninja123'),
            'role' => 'admin',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        User::firstOrCreate(['email' => 'pm@littleninjas.com.ar'], [
            'name' => 'PM Ninja',
            'password' => Hash::make('ninja123'),
            'role' => 'pm',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        User::firstOrCreate(['email' => 'ana@littleninjas.com.ar'], [
            'name' => 'Ana Editora',
            'password' => Hash::make('ninja123'),
            'role' => 'editor',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }
}
