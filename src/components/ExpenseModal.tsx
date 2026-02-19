import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { X, Loader2, Save, DollarSign, Calendar, Tag, Trash2 } from 'lucide-react';

type Expense = Database['public']['Tables']['expenses']['Row'];

interface Props {
    expense?: Expense | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function ExpenseModal({ expense, isOpen, onClose, onUpdate }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: expense?.name || '',
        amount: expense?.amount.toString() || '',
        type: (expense?.type || 'one-shot') as 'one-shot' | 'monthly',
        date: expense?.date || new Date().toISOString().split('T')[0],
        category: expense?.category || '',
        paid_by: (expense?.paid_by || 'Noé') as Database['public']['Enums']['team_member_enum'],
        is_deducted: expense?.is_deducted || false
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: expense?.name || '',
                amount: expense?.amount?.toString() || '',
                type: (expense?.type || 'one-shot') as 'one-shot' | 'monthly',
                date: expense?.date || new Date().toISOString().split('T')[0],
                category: expense?.category || '',
                paid_by: (expense?.paid_by || 'Noé') as Database['public']['Enums']['team_member_enum'],
                is_deducted: expense?.is_deducted || false
            });
        }
    }, [isOpen, expense]);

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const data = {
                name: formData.name,
                amount: parseFloat(formData.amount),
                type: formData.type,
                date: formData.date,
                category: formData.category || null,
                paid_by: formData.paid_by,
                is_deducted: formData.is_deducted
            };

            if (expense?.id) {
                const { error } = await supabase
                    .from('expenses')
                    .update(data)
                    .eq('id', expense.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('expenses')
                    .insert([data]);
                if (error) throw error;
            }

            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('Erreur lors de l\'enregistrement de la dépense');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!expense?.id || !confirm('Voulez-vous vraiment supprimer cette dépense ?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expense.id);

            if (error) throw error;
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Erreur lors de la suppression');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                            {expense ? 'Modifier Dépense' : 'Nouvelle Dépense'}
                        </h2>
                        <p className="text-sm text-slate-400">Suivi des coûts opérationnels</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Nom de la dépense</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="ex: Abonnement ChatGPT, Serveur..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Montant (€)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white font-bold text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'one-shot' | 'monthly' })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat"
                            >
                                <option value="one-shot">One Shot</option>
                                <option value="monthly">Mensuel</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                <input
                                    required
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Payé par</label>
                            <select
                                value={formData.paid_by}
                                onChange={(e) => setFormData({ ...formData, paid_by: e.target.value as any })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat"
                            >
                                <option value="Noé">Noé</option>
                                <option value="Baptiste">Baptiste</option>
                                <option value="Imrane">Imrane</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Catégorie</label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder="Logiciel, RH..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-600/5 border border-blue-500/20 p-4 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-blue-600/10 transition-colors" onClick={() => setFormData({ ...formData, is_deducted: !formData.is_deducted })}>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-white uppercase tracking-tight">Déduire du dispatch</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">La dépense sera retirée du pot commun avant partage.</p>
                        </div>
                        <div className={`w-10 h-5 rounded-full transition-colors relative ${formData.is_deducted ? 'bg-blue-600' : 'bg-slate-700'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.is_deducted ? 'left-6' : 'left-1'}`} />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <div className="flex-1 flex gap-3">
                            {expense && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                                    title="Supprimer la dépense"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                            >
                                Annuler
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2 rounded-xl transition-all flex items-center gap-2 font-bold shadow-lg shadow-blue-900/40"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {expense ? 'Mettre à jour' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
