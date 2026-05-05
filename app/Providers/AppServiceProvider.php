<?php

namespace App\Providers;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureGates();
    }

    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(app()->isProduction());

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)->mixedCase()->letters()->numbers()->symbols()->uncompromised()
            : null,
        );
    }

    protected function configureGates(): void
    {
        // Admin tiene acceso implícito a cualquier gate
        Gate::before(fn (User $user) => $user->isAdmin() ? true : null);

        // Editor con temporary_access activo al cliente, o admin vía before
        Gate::define('access-client', function (User $user, int $clientId) {
            return $user->canAccessClient($clientId);
        });

        // Solo PM o admin puede gestionar piezas de contenido
        Gate::define('manage-content', function (User $user) {
            return $user->isPm();
        });

        // Solo admin puede gestionar usuarios, clientes y accesos
        Gate::define('manage-users', function (User $user) {
            return $user->isAdmin();
        });
    }
}
