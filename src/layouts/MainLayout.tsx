import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    UserPlus,
    Briefcase,
    Settings,
    LogOut,
    Wallet,
    TrendingDown,
    Target,
    Linkedin,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { getUserRole, type UserRole } from '../lib/auth-helpers';

interface Props {
    children: React.ReactNode;
    role?: UserRole;
}

export function MainLayout({ children, role: roleProp }: Props) {
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<UserRole>(roleProp ?? null);
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);

            if (user?.email && !roleProp) {
                getUserRole().then(role => {
                    setUserRole(role);
                });
            }
        });
    }, [roleProp]);

    useEffect(() => {
        if (roleProp !== undefined) {
            setUserRole(roleProp);
        }
    }, [roleProp]);

    useEffect(() => {
        if (userRole === 'setter') {
            const unauthorizedPaths = ['/leads', '/contacts', '/clients', '/billing', '/expenses', '/'];
            if (unauthorizedPaths.includes(location.pathname)) {
                navigate('/setter');
            }
        }
        if (userRole === 'setter_linkedin') {
            if (location.pathname !== '/setter-linkedin') {
                navigate('/setter-linkedin');
            }
        }
    }, [userRole, location.pathname, navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const navItems = [
        { to: '/', icon: <LayoutDashboard size={20} />, label: 'Tableau de bord', allowedRoles: ['admin'] },
        { to: '/leads', icon: <UserPlus size={20} />, label: 'Leads', allowedRoles: ['admin'] },
        { to: '/contacts', icon: <Users size={20} />, label: 'Contacts', allowedRoles: ['admin'] },
        { to: '/clients', icon: <Briefcase size={20} />, label: 'Clients', allowedRoles: ['admin'] },
        { to: '/billing', icon: <Wallet size={20} />, label: 'Facturation', allowedRoles: ['admin'] },
        { to: '/expenses', icon: <TrendingDown size={20} />, label: 'Dépenses', allowedRoles: ['admin'] },
        { to: '/setter', icon: <Target size={20} />, label: 'Setter (s-i)', allowedRoles: ['admin', 'setter'] },
        { to: '/setter-linkedin', icon: <Linkedin size={20} />, label: 'Setter LinkedIn', allowedRoles: ['admin', 'setter_linkedin'] },
    ];

    const visibleNavItems = navItems.filter(item =>
        !userRole || item.allowedRoles.includes(userRole)
    );

    const userInitial = user?.email?.[0].toUpperCase() || 'U';

    return (
        <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out relative flex-shrink-0`}>
                {/* Toggle button */}
                <button
                    onClick={() => setCollapsed(prev => !prev)}
                    className="absolute -right-3 top-8 z-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shadow-lg"
                >
                    {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                </button>

                <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : ''} overflow-hidden`}>
                    {collapsed ? (
                        <span className="text-xl font-black text-blue-400">A</span>
                    ) : (
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent whitespace-nowrap">
                            CRM AURA
                        </h1>
                    )}
                </div>

                <nav className="flex-1 px-2 space-y-1">
                    {visibleNavItems.map(item => (
                        <NavItem
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                            collapsed={collapsed}
                        />
                    ))}
                </nav>

                <div className={`p-2 border-t border-slate-800 space-y-1`}>
                    {userRole !== 'setter_linkedin' && (
                        <NavItem to="/settings" icon={<Settings size={20} />} label="Paramètres" collapsed={collapsed} />
                    )}
                    <button
                        onClick={handleLogout}
                        title={collapsed ? 'Déconnexion' : undefined}
                        className={`flex items-center w-full px-3 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors duration-200 ${collapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut size={20} className={collapsed ? '' : 'mr-3'} />
                        {!collapsed && <span>Déconnexion</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative min-w-0">
                <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">
                        Bienvenue
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-white uppercase tracking-tight">{user?.email?.split('@')[0]}</span>
                            <span className="text-[10px] text-slate-500 font-medium">
                                {userRole === 'admin' ? 'ADMIN' : userRole === 'setter' ? 'SETTER' : userRole === 'setter_linkedin' ? 'SETTER LINKEDIN' : 'MEMBRE'}
                            </span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                            {userInitial}
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavItem({ to, icon, label, collapsed }: { to: string; icon: React.ReactNode; label: string; collapsed: boolean }) {
    return (
        <NavLink
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
                `flex items-center px-3 py-3 rounded-lg transition-all duration-200 group ${collapsed ? 'justify-center' : ''} ${isActive
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
            }
        >
            <span className={`${collapsed ? '' : 'mr-3'} group-hover:scale-110 transition-transform duration-200 flex-shrink-0`}>{icon}</span>
            {!collapsed && <span className="font-medium whitespace-nowrap">{label}</span>}
        </NavLink>
    );
}
