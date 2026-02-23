import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import {
    CheckCircle,
    Clock,
    Users,
    ArrowUpRight,
    DollarSign,
    TrendingDown,
    Wallet
} from 'lucide-react';
import { Link } from 'react-router-dom';

type Installment = Database['public']['Tables']['client_installments']['Row'] & {
    clients: (Database['public']['Tables']['clients']['Row'] & {
        contacts: Database['public']['Tables']['contacts']['Row'] | null;
    }) | null;
};

type Expense = Database['public']['Tables']['expenses']['Row'];

export function Billing() {
    const [loading, setLoading] = useState(true);
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [dispatchFilter, setDispatchFilter] = useState<'pending' | 'completed'>('pending');

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            setLoading(true);
            const [instRes, expensesRes] = await Promise.all([
                supabase.from('client_installments').select('*, clients(*, contacts(*))').order('due_date', { ascending: true }),
                supabase.from('expenses').select('*').order('date', { ascending: false })
            ]);

            if (instRes.error) throw instRes.error;
            if (expensesRes.error) throw expensesRes.error;

            setInstallments(instRes.data as Installment[] || []);
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

    const stats = installments.reduce((acc, inst) => {
        if (inst.status !== 'Payé') return acc;

        const amount = Number(inst.amount);
        return {
            totalPaid: acc.totalPaid + amount,
        };
    }, { totalPaid: 0 });

    // CA Signé = sum of all deal_amounts
    const uniqueClients = Array.from(new Set(installments.map(i => i.clients?.id))).map(id => installments.find(i => i.clients?.id === id)?.clients);
    const totalSignedCA = uniqueClients.reduce((sum, client) => sum + Number(client?.deal_amount || 0), 0);

    // For Setter Comms
    const uniqueClientsWithSetter = uniqueClients.filter(c => c?.setter_commission_percentage && c.setter_commission_percentage > 0);

    const totalSetterComms = uniqueClientsWithSetter.reduce((sum, client) => {
        if (!client) return sum;
        return sum + (Number(client.deal_amount) * (client.setter_commission_percentage || 0)) / 100;
    }, 0);

    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const deductedExpenses = expenses.filter(exp => exp.is_deducted);
    const totalDeductedAmount = deductedExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    const netBenefit = stats.totalPaid - totalExpenses - totalSetterComms;

    // Filter installments for dispatching
    const paidInstallments = installments.filter(i => i.status === 'Payé');
    const pendingDispatch = paidInstallments.filter(i => !i.is_dispatched);
    const completedDispatch = paidInstallments.filter(i => i.is_dispatched);

    const activeDispatchList = dispatchFilter === 'pending' ? pendingDispatch : completedDispatch;

    // Logic to calculate if setter fee should be applied to CURRENT installment
    const getSetterFee = (inst: Installment) => {
        if (!inst.clients || !inst.clients.setter_commission_percentage || inst.clients.setter_commission_percentage <= 0) return 0;

        // Find all installments for this client ordered by due_date
        const clientInsts = installments
            .filter(i => i.client_id === inst.client_id)
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

        // If this is the FIRST installment for the client, it bears the setter fee
        if (clientInsts[0]?.id === inst.id) {
            return (Number(inst.clients.deal_amount) * inst.clients.setter_commission_percentage) / 100;
        }
        return 0;
    };

    const getPlatformFee = (inst: Installment) => {
        const platform = inst.clients?.billing_platform || 'Mollie';
        const amount = Number(inst.amount);
        if (platform === 'Mollie' || platform === 'Revolut') return amount * 0.02;
        if (platform === 'GoCardless') return amount * 0.01;
        return 0;
    };

    async function toggleDispatch(inst: Installment) {
        try {
            const { error } = await supabase
                .from('client_installments')
                .update({ is_dispatched: !inst.is_dispatched })
                .eq('id', inst.id);

            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error toggling dispatch:', error);
        }
    }

    const totalPendingNetRevenue = pendingDispatch.reduce((sum, inst) => {
        const fees = getPlatformFee(inst);
        const setter = getSetterFee(inst);
        return sum + (Number(inst.amount) - fees - setter);
    }, 0);

    // Total to share = (Net Revenue - Deducted Expenses) * 70%
    // Note: This logic assumes all pending installments and all deducted expenses are handled in one go.
    const totalToShare = Math.max(0, (totalPendingNetRevenue - totalDeductedAmount) * 0.7);

    // Calculate per member
    const memberSummary = ["Noé", "Baptiste", "Imrane"].map(member => {
        // Find member's default percentage from any installment or use 33.33
        const firstInst = installments[0];
        const dist = (firstInst?.clients?.commission_distribution as any) || { "Noé": 33.33, "Baptiste": 33.33, "Imrane": 33.34 };
        const percentage = dist[member] || 0;

        const shareOfProfit = (totalToShare * percentage) / 100;
        const reimbursement = deductedExpenses
            .filter(exp => exp.paid_by === member)
            .reduce((sum, exp) => sum + Number(exp.amount), 0);

        return {
            name: member,
            total: shareOfProfit + reimbursement,
            share: shareOfProfit,
            reimbursement
        };
    });

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center text-white">
                <h1 className="text-3xl font-black uppercase tracking-tighter">Tableau de Bord Financier</h1>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl border border-slate-700">
                    <Clock size={16} className="text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">MAJ: {new Date().toLocaleDateString('fr-FR')}</span>
                </div>
            </div>

            {/* Main KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl relative overflow-hidden group">
                    <p className="text-slate-400 text-[9px] font-black uppercase mb-1 tracking-widest">CA Global (Signé)</p>
                    <h3 className="text-xl font-black text-white">{totalSignedCA.toLocaleString('fr-FR')} €</h3>
                    <div className="mt-4 flex items-center gap-2 text-[9px] text-blue-400 bg-blue-400/10 w-fit px-2 py-1 rounded-lg font-bold">
                        Potentiel Total
                    </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl relative overflow-hidden group border-blue-500/30">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={32} className="text-blue-400" />
                    </div>
                    <p className="text-slate-400 text-[9px] font-black uppercase mb-1 tracking-widest">CA Encaissé (Réel)</p>
                    <h3 className="text-xl font-black text-blue-400">{stats.totalPaid.toLocaleString('fr-FR')} €</h3>
                    <div className="mt-4 flex items-center gap-2 text-[9px] text-blue-400 bg-blue-400/10 w-fit px-2 py-1 rounded-lg font-bold">
                        Paiements Reçus
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
                    <h3 className="text-2xl font-black text-amber-400">-{totalSetterComms.toLocaleString('fr-FR')} €</h3>
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

            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <Users size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Dispatch Mensualités (70% Net)</h2>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700/50">
                        <button
                            onClick={() => setDispatchFilter('pending')}
                            className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all ${dispatchFilter === 'pending' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            À FAIRE ({pendingDispatch.length})
                        </button>
                        <button
                            onClick={() => setDispatchFilter('completed')}
                            className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all ${dispatchFilter === 'completed' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            TERMINÉ ({completedDispatch.length})
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">
                            {dispatchFilter === 'pending' ? 'Total Profit à Partager (70%)' : 'Total Dispatché'}
                        </p>
                        <p className={`text-xl font-black ${dispatchFilter === 'pending' ? 'text-purple-400' : 'text-emerald-400'}`}>
                            {totalToShare.toLocaleString('fr-FR')} €
                        </p>
                        {dispatchFilter === 'pending' && totalDeductedAmount > 0 && (
                            <p className="text-[10px] text-rose-400 mt-1">Après déduction de {totalDeductedAmount.toLocaleString('fr-FR')} € de dépenses</p>
                        )}
                    </div>

                    {dispatchFilter === 'pending' && (
                        <div className="flex gap-4">
                            {memberSummary.map(m => (
                                <div key={m.name} className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
                                    <p className="text-[8px] font-black text-slate-500 uppercase">{m.name}</p>
                                    <p className="text-sm font-black text-emerald-400">{m.total.toFixed(2)} €</p>
                                    {m.reimbursement > 0 && (
                                        <p className="text-[7px] text-blue-400 font-bold">Incl. {m.reimbursement.toFixed(2)}€ remb.</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-700">
                                <th className="px-3 py-3">Client / Mensualité</th>
                                <th className="px-3 py-3 text-center">Encaissé par</th>
                                <th className="px-3 py-3">Plateforme / Frais</th>
                                <th className="px-3 py-3">Setter</th>
                                <th className="px-3 py-3">Virements (70%)</th>
                                <th className="px-3 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {activeDispatchList.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-slate-500 italic text-sm">
                                        {dispatchFilter === 'pending' ? 'Toutes les mensualités sont dispatchées !' : 'Aucun dispatch terminé.'}
                                    </td>
                                </tr>
                            ) : (
                                activeDispatchList.map(inst => {
                                    const gross = Number(inst.amount);
                                    const platformFee = getPlatformFee(inst);
                                    const setterFee = getSetterFee(inst);
                                    const netToDistribute = (gross - platformFee - setterFee) * 0.7;

                                    const distribution = (inst.clients?.commission_distribution as any) || {
                                        "Noé": 33.33,
                                        "Baptiste": 33.33,
                                        "Imrane": 33.34
                                    };

                                    return (
                                        <tr key={inst.id} className="hover:bg-slate-750 transition-colors group">
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-bold text-white uppercase tracking-tight whitespace-nowrap">{inst.clients?.contacts?.nom}</p>
                                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                    <p className={`text-xs font-bold ${inst.status === 'En transit' ? 'text-indigo-400' : 'text-slate-500'}`}>
                                                        {gross.toLocaleString('fr-FR')} €
                                                    </p>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400 whitespace-nowrap">
                                                        {new Date(inst.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg border whitespace-nowrap ${inst.clients?.closed_by === 'Noé' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    inst.clients?.closed_by === 'Baptiste' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    }`}>
                                                    {inst.clients?.closed_by || 'Non défini'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold text-slate-300 uppercase">{inst.clients?.billing_platform || 'Mollie'}</p>
                                                    <p className="text-xs text-rose-400 font-bold">-{platformFee.toFixed(2)} €</p>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                {setterFee > 0 ? (
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-bold text-amber-400 uppercase">OUI</p>
                                                        <p className="text-xs text-amber-500/70 font-bold">-{setterFee.toFixed(2)} €</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-600 font-bold">NON</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {Object.entries(distribution).map(([member, percentage]) => {
                                                        const amount = (netToDistribute * (percentage as number)) / 100;
                                                        if (amount <= 0) return null;
                                                        return (
                                                            <div key={member} className="flex flex-col bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700 group-hover:border-slate-600 transition-colors min-w-[60px]">
                                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide mb-0.5">{member}</span>
                                                                <span className="text-xs font-black text-emerald-400">{amount.toFixed(2)} €</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <button
                                                    onClick={() => toggleDispatch(inst)}
                                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border ${inst.is_dispatched
                                                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                                                        : 'bg-slate-900 text-slate-500 hover:bg-emerald-600 hover:text-white border-slate-700 shadow-lg'
                                                        }`}
                                                >
                                                    {inst.is_dispatched ? (
                                                        <>
                                                            <CheckCircle size={12} />
                                                            <span>VALIIDÉ</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Wallet size={12} />
                                                            <span>VALIDER</span>
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
