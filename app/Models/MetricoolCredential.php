<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MetricoolCredential extends Model
{
    protected $table = 'metricool_credentials';

    protected $fillable = ['email', 'password'];

    protected function casts(): array
    {
        return [
            'password' => 'encrypted',
        ];
    }

    public static function getEmail(): ?string
    {
        return static::first()?->email;
    }

    public static function getPassword(): ?string
    {
        return static::first()?->password;
    }

    /** Password se deja sin tocar si viene null/vacío (permite cambiar solo el email). */
    public static function set(string $email, ?string $password): void
    {
        $data = ['email' => $email];
        if (filled($password)) {
            $data['password'] = $password;
        }

        $row = static::first();
        if ($row) {
            $row->update($data);
        } else {
            static::create($data);
        }
    }
}
