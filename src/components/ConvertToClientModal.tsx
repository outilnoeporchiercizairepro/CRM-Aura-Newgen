import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { X, Loader2, DollarSign, CheckCircle, Percent, Users } from 'lucide-react';

type Contact = Database['public']['Tables']['contacts']['Row'];
type PaymentMethod = Database['public']['Enums']['payment_method_enum'];
type TeamMember = Database['public']['Enums']['team_member_enum'];

interface Props {
    contact: Contact;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ['One shot', '2x', '3x', '4x'];
const TEAM_MEMBERS: TeamMember[] = ['Noé', 'Baptiste', 'Imrane'];

export function ConvertToClientModal({ contact, isOpen, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [hasSetter, setHasSetter] = useState(false);
    const [formData, setFormData] = useState({
        deal_amount: '',
        payment_method: 'One shot' as PaymentMethod,
        closed_by: 'Noé' as TeamMember,
        setter_commission_percentage: '10',
        amount_paid: '',
        distribution: {
            "Noé": 33.33,
            "Baptiste": 33.33,
            "Imrane": 33.34
        }
    });

    if (!isOpen) return null;

    // Auto-calculate initial payment
    const handleAmountChange = (val: string) => {
        const amount = parseFloat(val) || 0;
        let initialPaid = val;

        if (formData.payment_method === '2x') initialPaid = (amount / 2).toFixed(2);
        if (formData.payment_method === '3x') initialPaid = (amount / 3).toFixed(2);
        if (formData.payment_method === '4x') initialPaid = (amount / 4).toFixed(2);

        setFormData({ ...formData, deal_amount: val, amount_paid: initialPaid });
    };

    const handleMethodChange = (method: PaymentMethod) => {
        const amount = parseFloat(formData.deal_amount) || 0;
        let initialPaid = formData.deal_amount;

        if (method === '2x') initialPaid = (amount / 2).toFixed(2);
        if (method === '3x') initialPaid = (amount / 3).toFixed(2);
        if (method === '4x') initialPaid = (amount / 4).toFixed(2);

        setFormData({ ...formData, payment_method: method, amount_paid: initialPaid });
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const dealAmount = parseFloat(formData.deal_amount);
            const amountPaidInitial = parseFloat(formData.amount_paid) || 0;

            // 1. Create Client Record
            const { data: newClient, error: clientError } = await supabase
                .from('clients')
                .insert([{
                    contact_id: contact.id,
                    deal_amount: dealAmount,
                    payment_method: formData.payment_method,
                    closed_by: formData.closed_by,
                    setter_commission_percentage: hasSetter ? parseFloat(formData.setter_commission_percentage) : 0,
                    commission_distribution: formData.distribution,
                    amount_paid: amountPaidInitial
                }])
                .select()
                .single();

            if (clientError) throw clientError;

            // 2. Generate Installments
            let numPayments = 1;
            if (formData.payment_method === '2x') numPayments = 2;
            if (formData.payment_method === '3x') numPayments = 3;
            if (formData.payment_method === '4x') numPayments = 4;

            const installments = [];
            const remainingAmount = dealAmount - amountPaidInitial;
            const installmentAmount = numPayments > 1 ? remainingAmount / (numPayments - 1) : 0;

            // First payment (Initial)
            installments.push({
                client_id: newClient.id,
                amount: amountPaidInitial,
                due_date: new Date().toISOString(),
                status: 'Payé' as const
            });

            // Subsequent payments
            for (let i = 1; i < numPayments; i++) {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + (i * 30));

                installments.push({
                    client_id: newClient.id,
                    amount: parseFloat(installmentAmount.toFixed(2)),
                    due_date: dueDate.toISOString(),
                    status: 'En attente' as const
                });
            }

            const { error: installmentError } = await supabase
                .from('client_installments')
                .insert(installments);

            if (installmentError) throw installmentError;

            // 3. Update Contact Status
            const { error: contactError } = await supabase
                .from('contacts')
                .update({ status: 'Closé' })
                .eq('id', contact.id);

            if (contactError) throw contactError;

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error converting to client:', error);
            alert('Erreur lors de la conversion');
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 text-slate-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-emerald-900/10">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckCircle className="text-emerald-500" size={24} />
                            Validations de la vente
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Conversion de <span className="text-white font-medium">{contact.nom}</span></p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1 font-semibold uppercase text-xs">Montant total (€)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.deal_amount}
                                    onChange={(e) => handleAmountChange(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1 font-semibold uppercase text-xs">Mode de Paiement</label>
                            <select
                                value={formData.payment_method}
                                onChange={(e) => handleMethodChange(e.target.value as PaymentMethod)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                            >
                                {PAYMENT_METHODS.map(method => (
                                    <option key={method} value={method}>{method}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1 font-semibold uppercase text-xs">Montant encaissé initialement (€)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={formData.amount_paid}
                                onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-emerald-400 focus:outline-none focus:border-emerald-500 font-bold"
                                placeholder="0.00"
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 italic">L'échéancier des prochains paiements sera généré automatiquement.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1 font-semibold uppercase text-xs">Qui encaisse ?</label>
                        <select
                            value={formData.closed_by}
                            onChange={(e) => setFormData({ ...formData, closed_by: e.target.value as TeamMember })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                        >
                            {TEAM_MEMBERS.map(member => (
                                <option key={member} value={member}>{member}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-300">Commission Setter</span>
                            <div className="flex bg-slate-700 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setHasSetter(true)}
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${hasSetter ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Oui
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHasSetter(false)}
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${!hasSetter ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Non
                                </button>
                            </div>
                        </div>

                        {hasSetter && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                                <div className="relative">
                                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                    <input
                                        type="number"
                                        value={formData.setter_commission_percentage}
                                        onChange={(e) => setFormData({ ...formData, setter_commission_percentage: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:border-emerald-500 outline-none"
                                        placeholder="%"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Users size={18} />
                            <h3 className="text-sm font-semibold uppercase tracking-wider">Dispatch Associés (%)</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {TEAM_MEMBERS.map(member => (
                                <div key={member}>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{member}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.distribution[member as keyof typeof formData.distribution]}
                                        onChange={(e) => handleDistributionChange(member, e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm focus:border-emerald-500 outline-none"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex justify-center items-center gap-2 font-bold shadow-lg shadow-emerald-900/20"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                            Confirmer et Encaisser
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
