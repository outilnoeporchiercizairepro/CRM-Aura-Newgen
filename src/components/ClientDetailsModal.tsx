import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { X, Loader2, DollarSign, PieChart, TrendingUp, Save, Calendar, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

type Client = Database['public']['Tables']['clients']['Row'] & {
    contacts: Database['public']['Tables']['contacts']['Row'] | null
};

type Installment = Database['public']['Tables']['client_installments']['Row'];
type PaymentMethod = Database['public']['Enums']['payment_method_enum'];
type TeamMember = Database['public']['Enums']['team_member_enum'];

interface Props {
    client: Client;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ['One shot', '2x', '3x', '4x'];
const TEAM_MEMBERS: TeamMember[] = ['Noé', 'Baptiste', 'Imrane'];

export function ClientDetailsModal({ client, isOpen, onClose, onUpdate }: Props) {
    const [loading, setLoading] = useState(false);
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [loadingInstallments, setLoadingInstallments] = useState(false);

    const [formData, setFormData] = useState({
        deal_amount: client.deal_amount.toString(),
        amount_paid: client.amount_paid?.toString() || '0',
        payment_method: (client.payment_method || 'One shot') as PaymentMethod,
        billing_platform: (client.billing_platform || 'Mollie') as Database['public']['Enums']['billing_platform_enum'],
        closed_by: (client.closed_by || 'Noé') as TeamMember,
        setter_commission_percentage: client.setter_commission_percentage?.toString() || '0',
        distribution: (client.commission_distribution as any) || {
            "Noé": 33.33,
            "Baptiste": 33.33,
            "Imrane": 33.34
        }
    });

    useEffect(() => {
        if (isOpen) {
            fetchInstallments();
            setFormData({
                deal_amount: client.deal_amount.toString(),
                amount_paid: client.amount_paid?.toString() || '0',
                payment_method: (client.payment_method || 'One shot') as PaymentMethod,
                billing_platform: (client.billing_platform || 'Mollie') as Database['public']['Enums']['billing_platform_enum'],
                closed_by: (client.closed_by || 'Noé') as TeamMember,
                setter_commission_percentage: client.setter_commission_percentage?.toString() || '0',
                distribution: (client.commission_distribution as any) || {
                    "Noé": 33.33,
                    "Baptiste": 33.33,
                    "Imrane": 33.34
                }
            });
        }
    }, [client, isOpen]);

    async function fetchInstallments() {
        setLoadingInstallments(true);
        try {
            const { data, error } = await supabase
                .from('client_installments')
                .select('*')
                .eq('client_id', client.id)
                .order('due_date', { ascending: true });

            if (error) throw error;
            setInstallments(data || []);
        } catch (error) {
            console.error('Error fetching installments:', error);
        } finally {
            setLoadingInstallments(false);
        }
    }

    if (!isOpen) return null;

    const dealAmount = parseFloat(formData.deal_amount) || 0;

    // AmountPaid should be dynamic based on installments if they exist
    const installmentsTotalPaid = installments
        .filter(i => i.status === 'Payé')
        .reduce((sum, i) => sum + Number(i.amount), 0);

    // Use the maximum of the two or installments if they exist
    const amountPaid = installments.length > 0 ? installmentsTotalPaid : (parseFloat(formData.amount_paid) || 0);

    const amountPending = dealAmount - amountPaid;
    const setterPerc = parseFloat(formData.setter_commission_percentage) || 0;

    const setterAmount = (dealAmount * setterPerc) / 100;
    const amountAfterSetter = dealAmount - setterAmount;

    async function handleSave() {
        setLoading(true);
        try {
            // Check if payment method changed
            if (formData.payment_method !== client.payment_method) {
                if (!confirm("Le mode de paiement a été modifié. Voulez-vous sauvegarder ? L'échéancier devra probablement être régénéré.")) {
                    setLoading(false);
                    return;
                }
            }

            const { error } = await supabase
                .from('clients')
                .update({
                    deal_amount: dealAmount,
                    amount_paid: amountPaid, // Still using the statistical sum
                    payment_method: formData.payment_method,
                    billing_platform: formData.billing_platform,
                    closed_by: formData.closed_by,
                    setter_commission_percentage: setterPerc,
                    commission_distribution: formData.distribution
                })
                .eq('id', client.id);

            if (error) throw error;
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating client:', error);
            alert('Erreur lors de la mise à jour');
        } finally {
            setLoading(false);
        }
    }

    async function generateSchedule() {
        setLoading(true);
        try {
            let numPayments = 1;
            if (formData.payment_method === '2x') numPayments = 2;
            if (formData.payment_method === '3x') numPayments = 3;
            if (formData.payment_method === '4x') numPayments = 4;

            // Confirm before overwriting
            if (installments.length > 0) {
                if (!confirm("Un échéancier existe déjà. Voulez-vous le supprimer et en générer un nouveau ?")) {
                    setLoading(false);
                    return;
                }

                const { error: deleteError } = await supabase
                    .from('client_installments')
                    .delete()
                    .eq('client_id', client.id);

                if (deleteError) throw deleteError;
            }

            const newInstallments = [];

            if (numPayments === 1) {
                // One shot: single installment for full amount
                newInstallments.push({
                    client_id: client.id,
                    amount: dealAmount,
                    due_date: new Date().toISOString(),
                    status: amountPaid >= dealAmount ? 'Payé' : 'En attente'
                });
            } else {
                const initialPaid = amountPaid;
                const remainingAmount = dealAmount - initialPaid;
                const installmentAmount = remainingAmount / (numPayments - 1);

                // First payment (already partially or fully paid)
                newInstallments.push({
                    client_id: client.id,
                    amount: initialPaid,
                    due_date: new Date().toISOString(),
                    status: 'Payé'
                });

                // Subsequent payments
                for (let i = 1; i < numPayments; i++) {
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + (i * 30));

                    newInstallments.push({
                        client_id: client.id,
                        amount: parseFloat(installmentAmount.toFixed(2)),
                        due_date: dueDate.toISOString(),
                        status: 'En attente'
                    });
                }
            }

            const { error: insertError } = await supabase.from('client_installments').insert(newInstallments);
            if (insertError) throw insertError;

            fetchInstallments();
        } catch (error) {
            console.error('Error generating schedule:', error);
            alert('Erreur lors de la génération');
        } finally {
            setLoading(false);
        }
    }

    async function setInstallmentStatus(installment: Installment, targetStatus: string) {
        if (installment.status === targetStatus) return;
        setLoading(true);
        try {
            // 1. Calculate delta for amount_paid
            const instAmount = Number(installment.amount);
            const wasConsideredPaid = installment.status === 'Payé';
            const isNowConsideredPaid = targetStatus === 'Payé';

            let newTotalPaid = amountPaid;
            if (!wasConsideredPaid && isNowConsideredPaid) {
                newTotalPaid += instAmount;
            } else if (wasConsideredPaid && !isNowConsideredPaid) {
                newTotalPaid -= instAmount;
            }

            // 2. Update Installment
            const { error: instError } = await supabase
                .from('client_installments')
                .update({ status: targetStatus })
                .eq('id', installment.id);

            if (instError) throw instError;

            // 3. Update Client if amount changed
            if (newTotalPaid !== amountPaid) {
                const { error: clientError } = await supabase
                    .from('clients')
                    .update({ amount_paid: newTotalPaid })
                    .eq('id', client.id);

                if (clientError) throw clientError;
                setFormData({ ...formData, amount_paid: newTotalPaid.toString() });
            }

            fetchInstallments();
            onUpdate();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Erreur lors de la mise à jour du statut');
        } finally {
            setLoading(false);
        }
    }

    async function deleteSchedule() {
        if (!confirm("Voulez-vous vraiment supprimer tout l'échéancier ?")) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('client_installments')
                .delete()
                .eq('client_id', client.id);
            if (error) throw error;
            fetchInstallments();
        } catch (error) {
            console.error('Error deleting schedule:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleDistributionChange = (member: string, value: string) => {
        setFormData({
            ...formData,
            distribution: {
                ...formData.distribution,
                [member]: parseFloat(value) || 0
            }
        });
    };

    async function handleDeleteClient() {
        if (!client.id || !confirm("Voulez-vous vraiment supprimer ce client ? Toutes les données associées (mensualités, paiements reçus) seront DEFINITIVEMENT supprimées.")) return;

        setLoading(true);
        try {
            // First delete associated installments
            const { error: instError } = await supabase
                .from('client_installments')
                .delete()
                .eq('client_id', client.id);

            if (instError) throw instError;

            // Then delete the client
            const { error: clientError } = await supabase
                .from('clients')
                .delete()
                .eq('id', client.id);

            if (clientError) throw clientError;

            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error deleting client:', error);
            alert('Erreur lors de la suppression du client');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-tight">{client.contacts?.nom || 'Client'}</h2>
                        <p className="text-sm text-slate-400">Gestion Financière & Échéancier</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden max-h-[85vh]">
                    {/* Left: General Info & Commissions */}
                    <div className="flex-1 p-6 space-y-8 overflow-y-auto">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-white">
                                <TrendingUp size={18} className="text-blue-400" />
                                <h3 className="text-sm font-bold uppercase tracking-wider">Paramètres du Deal</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Montant Deal (€)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                        <input
                                            type="number"
                                            value={formData.deal_amount}
                                            onChange={(e) => setFormData({ ...formData, deal_amount: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white font-bold text-sm outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Mode de Paiement</label>
                                    <select
                                        value={formData.payment_method}
                                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as PaymentMethod })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat"
                                    >
                                        {PAYMENT_METHODS.map(method => (
                                            <option key={method} value={method}>{method}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Plateforme de Paiement</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['Mollie', 'GoCardless', 'Revolut'] as const).map(platform => (
                                        <button
                                            key={platform}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, billing_platform: platform })}
                                            className={`py-2 px-1 text-[10px] font-black rounded-lg border transition-all ${formData.billing_platform === platform
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                                }`}
                                        >
                                            {platform}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-[10px] text-emerald-500 font-bold uppercase">Total Encaissé</label>
                                    <span className="text-2xl font-black text-emerald-400">{amountPaid.toLocaleString('fr-FR')} €</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 italic">Reste à percevoir</span>
                                    <span className={`font-bold ${amountPending > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                        {amountPending.toLocaleString('fr-FR')} €
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-slate-800">
                            <div className="flex items-center gap-2 text-white">
                                <PieChart size={18} className="text-blue-400" />
                                <h3 className="text-sm font-bold uppercase tracking-wider">Répartition Commissions</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Setter (%)</label>
                                        <input
                                            type="number"
                                            value={formData.setter_commission_percentage}
                                            onChange={(e) => setFormData({ ...formData, setter_commission_percentage: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Qui encaisse ?</label>
                                        <select
                                            value={formData.closed_by}
                                            onChange={(e) => setFormData({ ...formData, closed_by: e.target.value as TeamMember })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat"
                                        >
                                            {TEAM_MEMBERS.map(member => (
                                                <option key={member} value={member}>{member}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-3">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Dispatch Associés (Net de Setter)</p>
                                    {TEAM_MEMBERS.map(member => (
                                        <div key={member} className="flex items-center justify-between">
                                            <span className="text-xs text-slate-300">{member}</span>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    value={formData.distribution[member as keyof typeof formData.distribution]}
                                                    onChange={(e) => handleDistributionChange(member, e.target.value)}
                                                    className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[10px] text-right"
                                                />
                                                <span className="text-[10px] text-slate-600 w-4">%</span>
                                                <span className="text-xs font-bold text-white min-w-[70px] text-right">
                                                    {((amountAfterSetter * (formData.distribution[member as keyof typeof formData.distribution] || 0)) / 100).toLocaleString('fr-FR')} €
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Payment Schedule */}
                    <div className="w-full md:w-[450px] bg-slate-900/50 p-6 space-y-6 overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white">
                                <Calendar size={18} className="text-blue-400" />
                                <h3 className="text-sm font-bold uppercase tracking-wider">Échéancier</h3>
                            </div>
                            {installments.length > 0 && (
                                <button
                                    onClick={deleteSchedule}
                                    className="text-slate-600 hover:text-rose-500 transition-colors"
                                    title="Supprimer l'échéancier"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {loadingInstallments ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-600" /></div>
                            ) : installments.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center bg-slate-800/20 border-2 border-dashed border-slate-800 rounded-2xl gap-4">
                                    <div className="p-3 bg-slate-800 rounded-full text-slate-600">
                                        <RefreshCw size={32} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-slate-400 text-sm font-medium">Aucun échéancier généré</p>
                                        <p className="text-slate-600 text-[10px] mt-1">Générez-le pour suivre les prochains paiements</p>
                                    </div>
                                    <button
                                        onClick={generateSchedule}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-900/40"
                                    >
                                        Générer l'échéancier
                                    </button>
                                </div>
                            ) : (
                                installments.map((inst, idx) => {
                                    const isPaid = inst.status === 'Payé';
                                    const isTransit = inst.status === 'En transit';
                                    const isWaiting = !isPaid && !isTransit;
                                    const isOverdue = isWaiting && new Date(inst.due_date) < new Date();

                                    return (
                                        <div
                                            key={inst.id}
                                            className={`p-4 rounded-xl border transition-all ${isPaid
                                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                                : isTransit
                                                    ? 'bg-indigo-500/5 border-indigo-500/30 shadow-inner shadow-indigo-500/10'
                                                    : isOverdue
                                                        ? 'bg-rose-500/5 border-rose-500/30'
                                                        : 'bg-slate-800/40 border-slate-700/50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                                                        Échéance {idx + 1}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg font-black text-white">{Number(inst.amount).toLocaleString('fr-FR')} €</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="flex items-center text-[11px] font-bold text-slate-400">
                                                        État du paiement
                                                    </div>
                                                    <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700">
                                                        <button
                                                            onClick={() => setInstallmentStatus(inst, 'En attente')}
                                                            className={`px-3 py-1 text-[9px] rounded-md transition-all font-black ${isWaiting ? 'bg-slate-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                                        >
                                                            NON
                                                        </button>
                                                        <button
                                                            onClick={() => setInstallmentStatus(inst, 'En transit')}
                                                            className={`px-3 py-1 text-[9px] rounded-md transition-all font-black ${isTransit ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                                        >
                                                            TRANSIT
                                                        </button>
                                                        <button
                                                            onClick={() => setInstallmentStatus(inst, 'Payé')}
                                                            className={`px-3 py-1 text-[9px] rounded-md transition-all font-black ${isPaid ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                                        >
                                                            OUI
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex justify-between items-center text-[11px]">
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <Calendar size={12} />
                                                    {new Date(inst.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                </div>
                                                {isOverdue && (
                                                    <span className="flex items-center gap-1 text-[10px] font-black text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded uppercase">
                                                        <AlertTriangle size={10} /> Retard
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex justify-between items-center px-8">
                    <button
                        onClick={handleDeleteClient}
                        disabled={loading}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                    >
                        <Trash2 size={18} />
                        Supprimer le client
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2 rounded-xl transition-all flex items-center gap-2 font-bold shadow-lg shadow-blue-900/40"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Sauvegarder les modifications
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
