import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    UserPlus,
    Briefcase,
    Settings,
    LogOut,
    Wallet,
    TrendingDown,
    Target
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

interface Props {
    children: React.ReactNode;
}

export function MainLayout({ children }: Props) {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const userInitial = user?.email?.[0].toUpperCase() || 'U';
    return (
        <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        CRM AURA
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Tableau de bord" />
                    <NavItem to="/leads" icon={<UserPlus size={20} />} label="Leads" />
                    <NavItem to="/contacts" icon={<Users size={20} />} label="Contacts" />
                    <NavItem to="/clients" icon={<Briefcase size={20} />} label="Clients" />
                    <NavItem to="/billing" icon={<Wallet size={20} />} label="Facturation" />
                    <NavItem to="/expenses" icon={<TrendingDown size={20} />} label="Dépenses" />
                    <NavItem to="/setter" icon={<Target size={20} />} label="Setter (s-i)" />
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-2">
                    <NavItem to="/settings" icon={<Settings size={20} />} label="Paramètres" />
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors duration-200"
                    >
                        <LogOut size={20} className="mr-3" />
                        <span>Déconnexion</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative">
                <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">
                        {/* Dynamic Title could go here */}
                        Bienvenue
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-white uppercase tracking-tight">{user?.email?.split('@')[0]}</span>
                            <span className="text-[10px] text-slate-500 font-medium">{user?.email === 'admin@aura-academie.com' ? 'ADMIN' : 'MEMBRE'}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                            {userInitial}
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
            }
        >
            <span className="mr-3 group-hover:scale-110 transition-transform duration-200">{icon}</span>
            <span className="font-medium">{label}</span>
            {/* Active Indicator */}
        </NavLink>
    );
}
