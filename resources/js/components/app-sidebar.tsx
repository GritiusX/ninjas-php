import { Link, usePage } from '@inertiajs/react';
import { AlertTriangle, BarChart3, Bell, Film, LayoutGrid, Settings, Shield, Sparkles, Users } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import * as adminRoutes from '@/routes/admin';
import * as adminClientRoutes from '@/routes/admin/clients';
import * as adminUserRoutes from '@/routes/admin/users';
import * as metricsRoutes from '@/routes/metrics';
import * as editorRoutes from '@/routes/editor';
import * as notifRoutes from '@/routes/notifications';
import * as pmRoutes from '@/routes/pm';
import type { Auth, NavItem } from '@/types';

function useNavItems(): NavItem[] {
    const { auth } = usePage<{ auth: Auth }>().props;
    const role = auth.user.role;
    const unread = auth.user.unread_notifications;

    const notifItem: NavItem = {
        title: unread > 0 ? `Notificaciones (${unread})` : 'Notificaciones',
        href: notifRoutes.index(),
        icon: Bell,
    };

    if (role === 'editor') {
        return [
            { title: 'Mi panel', href: editorRoutes.dashboard(), icon: LayoutGrid },
            notifItem,
        ];
    }

    const pmItems: NavItem[] = [
        { title: 'Dashboard PM', href: pmRoutes.dashboard(), icon: LayoutGrid },
        { title: 'Métricas', href: metricsRoutes.index(), icon: BarChart3 },
        notifItem,
    ];

    if (role === 'admin') {
        pmItems.push(
            { title: 'Usuarios', href: adminUserRoutes.index(), icon: Users },
            { title: 'Clientes', href: adminClientRoutes.index(), icon: Film },
            { title: 'Accesos / Matriz', href: adminRoutes.matrix(), icon: Shield },
            { title: 'Alertas', href: '/admin/alerts', icon: Bell },
            { title: 'Contexto IA', href: '/admin/ai-context', icon: Sparkles },
            { title: 'Logs de errores', href: '/admin/error-logs', icon: AlertTriangle },
        );
    }

    return pmItems;
}

function homeHref(role: string) {
    if (role === 'editor') return editorRoutes.dashboard();
    return pmRoutes.dashboard();
}

export function AppSidebar() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const navItems = useNavItems();

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={homeHref(auth.user.role)} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
