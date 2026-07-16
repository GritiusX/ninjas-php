export type User = {
    id: number;
    name: string;
    email: string;
    role: 'editor' | 'pm' | 'admin' | 'superadmin';
    avatar?: string;
    email_verified_at: string | null;
    unread_notifications: number;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
