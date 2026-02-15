import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
// import type { Database } from '../types/supabase'; // Unused for now in this file

export function Dashboard() {
    const [stats, setStats] = useState({
        leads: 0,
        contacts: 0,
        clients: 0,
        revenue: 0
    });

    useEffect(() => {
        async function fetchStats() {
            const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
            const { count: contactsCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true });

            const { data: clients } = await supabase.from('clients').select('deal_amount');
            const revenue = clients?.reduce((acc, client) => acc + (Number(client.deal_amount) || 0), 0) || 0;

            setStats({
                leads: leadsCount || 0,
                contacts: contactsCount || 0,
                clients: clients?.length || 0,
                revenue
            });
        }

        fetchStats();
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Total Leads" value={stats.leads.toString()} trend="+0%" />
            <StatCard title="Contacts Actifs" value={stats.contacts.toString()} trend="+0%" />
            <StatCard title="Chiffre d'Affaires" value={`${stats.revenue.toLocaleString('fr-FR')} €`} trend="+0%" />

            <div className="col-span-1 md:col-span-3 bg-slate-800/50 border border-slate-700 rounded-xl p-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Activité Récente</h3>
                <p className="text-slate-400">Aucune activité récente pour le moment.</p>
            </div>
        </div>
    );
}

function StatCard({ title, value, trend }: { title: string; value: string; trend: string }) {
    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors duration-200 cursor-pointer group">
            <h3 className="text-sm font-medium text-slate-400 mb-1">{title}</h3>
            <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-white group-hover:text-blue-400 transition-colors">{value}</p>
                <span className="text-emerald-400 text-sm font-medium bg-emerald-400/10 px-2 py-1 rounded">{trend}</span>
            </div>
        </div>
    )
}
