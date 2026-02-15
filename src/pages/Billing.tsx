import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import {
    CheckCircle,
    Clock,
    Users,
    ArrowUpRight,
    PieChart as PieChartIcon,
    DollarSign,
    TrendingDown
} from 'lucide-react';
import { Link } from 'react-router-dom';

type Client = Database['public']['Tables']['clients']['Row'] & {
    contacts: Database['public']['Tables']['contacts']['Row'] | null;
};

type Expense = Database['public']['Tables']['expenses']['Row'];

export function Billing() {
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<Client[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [dispatchFilter, setDispatchFilter] = useState<'pending' | 'completed'>('pending');

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            setLoading(true);
            const [clientsRes, expensesRes] = await Promise.all([
                supabase.from('clients').select('*, contacts(*)'),
                supabase.from('expenses').select('*').order('date', { ascending: false })
            ]);

            if (clientsRes.error) throw clientsRes.error;
            if (expensesRes.error) throw expensesRes.error;

            setClients(clientsRes.data as Client[] || []);
            setExpenses(expensesRes.data || []);
        } catch (error) {
            console.error('Error fetching billing data:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Clock className="animate-spin text-blue-500 mr-2" size={24} />
                <span className="text-slate-400 font-medium">Chargement des données financières...</span>
            </div>
        );
    }

    const stats = clients.reduce((acc, client) => {
        const total = Number(client.deal_amount || 0);
        const paid = Number(client.amount_paid || 0);
        const setterPerc = Number(client.setter_commission_percentage || 0);
        const setterAmount = (total * setterPerc) / 100;

        return {
            totalCA: acc.totalCA + total,
            totalPaid: acc.totalPaid + paid,
            totalSetterComms: acc.totalSetterComms + setterAmount
        };
    }, { totalCA: 0, totalPaid: 0, totalSetterComms: 0 });

    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const netBenefit = stats.totalCA - totalExpenses - stats.totalSetterComms;

    // 70% of CA for partners distribution
    const pendingDispatch = clients.filter(c => !c.is_dispatched);
    const completedDispatch = clients.filter(c => c.is_dispatched);
    const totalToDispatch = pendingDispatch.reduce((sum, c) => sum + (Number(c.deal_amount) * 0.7), 0);

    const activeDispatchList = dispatchFilter === 'pending' ? pendingDispatch : completedDispatch;

    async function toggleDispatch(client: Client) {
        try {
            const { error } = await supabase
                .from('clients')
                .update({ is_dispatched: !client.is_dispatched })
                .eq('id', client.id);

            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error toggling dispatch:', error);
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white uppercase tracking-tighter">Facturation & Finance</h1>
                    <p className="text-slate-400 text-sm mt-1">Vue d'ensemble de la santé financière d'AURA</p>
                </div>
            </div>

            {/* Main KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={48} className="text-blue-400" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1 tracking-widest">CA Global</p>
                    <h3 className="text-2xl font-black text-white">{stats.totalCA.toLocaleString('fr-FR')} €</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-blue-400 bg-blue-400/10 w-fit px-2 py-1 rounded-lg font-bold">
                        Total Deals Signés
                    </div>
                </div>

                <Link to="/expenses" className="bg-slate-800 border border-slate-700 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingDown size={48} className="text-rose-400" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1 tracking-widest">Dépenses Totales</p>
                    <h3 className="text-2xl font-black text-rose-400">-{totalExpenses.toLocaleString('fr-FR')} €</h3>
                    <div className="mt-4 flex items-center justify-between text-[10px] font-bold">
                        <span className="text-rose-400 bg-rose-400/10 px-2 py-1 rounded-lg">Coûts Opérationnels</span>
                        <span className="text-blue-400 group-hover:underline flex items-center gap-1">
                            Détails <ArrowUpRight size={12} />
                        </span>
                    </div>
                </Link>

                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users size={48} className="text-amber-400" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1 tracking-widest">Commissions Setters</p>
                    <h3 className="text-2xl font-black text-amber-400">-{stats.totalSetterComms.toLocaleString('fr-FR')} €</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-amber-400 bg-amber-400/10 w-fit px-2 py-1 rounded-lg font-bold">
                        Part Apporteurs
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-1 rounded-2xl shadow-xl shadow-emerald-900/20">
                    <div className="bg-slate-900 h-full w-full rounded-[14px] p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ArrowUpRight size={48} className="text-emerald-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase mb-1 tracking-widest">Bénéfice Net</p>
                        <h3 className="text-2xl font-black text-emerald-400">{netBenefit.toLocaleString('fr-FR')} €</h3>
                        <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-400/10 w-fit px-2 py-1 rounded-lg font-bold">
                            Trésorerie Réelle
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Analysis / Chart Area Placeholder */}
                <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <PieChartIcon size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Analyse des Flux</h2>
                        </div>
                    </div>

                    {/* CSS-based simple visualization of percentages */}
                    <div className="space-y-6">
                        <div className="h-4 w-full bg-slate-700 rounded-full overflow-hidden flex">
                            <div
                                style={{ width: `${(netBenefit / stats.totalCA) * 100}%` }}
                                className="bg-emerald-500 h-full"
                                title="Bénéfice Net"
                            />
                            <div
                                style={{ width: `${(totalExpenses / stats.totalCA) * 100}%` }}
                                className="bg-rose-500 h-full"
                                title="Dépenses"
                            />
                            <div
                                style={{ width: `${(stats.totalSetterComms / stats.totalCA) * 100}%` }}
                                className="bg-amber-500 h-full"
                                title="Commissions Setters"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="flex items-start gap-2">
                                <div className="w-3 h-3 rounded bg-emerald-500 mt-1" />
                                <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Bénéfice Net</p>
                                    <p className="text-sm font-bold text-white">{Math.max(0, (netBenefit / stats.totalCA) * 100).toFixed(1)}%</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="w-3 h-3 rounded bg-rose-500 mt-1" />
                                <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Dépenses</p>
                                    <p className="text-sm font-bold text-white">{((totalExpenses / stats.totalCA) * 100).toFixed(1)}%</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="w-3 h-3 rounded bg-amber-500 mt-1" />
                                <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Setters</p>
                                    <p className="text-sm font-bold text-white">{((stats.totalSetterComms / stats.totalCA) * 100).toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-700/50">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                <Users size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Dispatch Membres (70%)</h2>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700/50 mb-6">
                            <button
                                onClick={() => setDispatchFilter('pending')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${dispatchFilter === 'pending' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                À FAIRE ({pendingDispatch.length})
                            </button>
                            <button
                                onClick={() => setDispatchFilter('completed')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${dispatchFilter === 'completed' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                TERMINÉ ({completedDispatch.length})
                            </button>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 flex justify-between items-center mb-6">
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">
                                    {dispatchFilter === 'pending' ? 'En attente de virement' : 'Total Dispatché'}
                                </p>
                                <p className={`text-xl font-black ${dispatchFilter === 'pending' ? 'text-purple-400' : 'text-emerald-400'}`}>
                                    {(dispatchFilter === 'pending' ? totalToDispatch : clients.filter(c => c.is_dispatched).reduce((sum, c) => sum + (Number(c.deal_amount) * 0.7), 0)).toLocaleString('fr-FR')} €
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Dossiers</p>
                                <p className="text-xl font-black text-white">{activeDispatchList.length}</p>
                            </div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {activeDispatchList.length === 0 ? (
                                <p className="text-center py-8 text-slate-500 italic text-sm">
                                    {dispatchFilter === 'pending' ? 'Tous les clients sont dispatchés !' : 'Aucun dispatch terminé.'}
                                </p>
                            ) : (
                                activeDispatchList.map(client => {
                                    const amount = Number(client.deal_amount) * 0.7;
                                    return (
                                        <div key={client.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex justify-between items-center hover:bg-slate-750 transition-colors">
                                            <div>
                                                <p className="text-xs font-bold text-white uppercase tracking-tight">{client.contacts?.nom}</p>
                                                <p className="text-[10px] text-slate-500">Montant Deal: {Number(client.deal_amount).toLocaleString('fr-FR')} €</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className={`text-xs font-black ${client.is_dispatched ? 'text-slate-500' : 'text-emerald-400'}`}>
                                                        {amount.toLocaleString('fr-FR')} €
                                                    </p>
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold">
                                                        {client.is_dispatched ? 'Dispatché' : 'À dispatcher'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => toggleDispatch(client)}
                                                    className={`p-2 rounded-lg transition-all border ${client.is_dispatched
                                                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                                                        : 'bg-slate-900 text-slate-500 hover:bg-emerald-600 hover:text-white border-slate-700'
                                                        }`}
                                                    title={client.is_dispatched ? 'Marquer comme à faire' : 'Confirmer le dispatchment'}
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
