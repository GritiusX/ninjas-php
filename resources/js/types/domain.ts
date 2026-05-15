export type ContentStatus =
    | 'BRIEF'
    | 'EDITING'
    | 'INTERNAL_REVIEW'
    | 'REVISION'
    | 'PM_APPROVED'
    | 'CLIENT_REVIEW'
    | 'CLIENT_REVISION'
    | 'CLIENT_APPROVED';

export type Priority = 1 | 2 | 3;

export type Client = {
    id: number;
    name: string;
    whatsapp_number: string | null;
    roas_goal: number;
    meta_ad_account_id: string | null;
    metricool_blog_id: string | null;
};

export type MetricArea = 'awareness' | 'content' | 'community' | 'ads' | 'system';

export type MonthlyMetricValue = {
    metric_key: string;
    value: number | null;
    previous: number | null;
    delta_pct: number | null;
};

export type MonthlySnapshotByArea = Record<MetricArea, MonthlyMetricValue[]>;

export type MetricsClientSummary = {
    id: number;
    name: string;
    metricool_blog_id: string | null;
    has_data: boolean;
    last_synced_at: string | null;
};

export type Editor = {
    id: number;
    name: string;
};

export type ContentPiece = {
    id: number;
    client_id: number;
    assigned_editor_id: number | null;
    status: ContentStatus;
    priority: Priority;
    deadline: string | null;
    concept: string | null;
    product: string | null;
    category: string | null;
    objective: string | null;
    hook: string | null;
    development: string | null;
    cta: string | null;
    brief_notes: string | null;
    client_status: string | null;
    is_scheduled: boolean;
    raw_material_link: string | null;
    final_video_link: string | null;
    internal_comments: string | null;
    client_feedback: string | null;
    generated_copy: GeneratedCopy | null;
    created_at: string;
    updated_at: string;
    client?: Client;
    editor?: Editor;
};

export type GeneratedCopy = {
    directo: string;
    storytelling: string;
    educativo: string;
};

export type AppNotification = {
    id: number;
    user_id: number;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    read_at: string | null;
    created_at: string;
};

export type AdMetricRow = {
    id: number;
    name: string;
    roas_goal: number;
    total_investment: number;
    total_revenue: number;
    total_transactions: number;
    roas_periodo: number | null;
    semaforo: 'green' | 'yellow' | 'red';
};
