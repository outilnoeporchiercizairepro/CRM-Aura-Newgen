import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import {
    Plus,
    TrendingDown,
    Calendar,
    Clock,
    Search,
    ArrowLeft,
    Trash2,
    CheckCircle2,
    History,
    X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ExpenseModal } from '../components/ExpenseModal';

type Expense = Database['public']['Tables']['expenses']['Row'];
type ExpenseDeduction = Database['public']['Tables']['expense_deductions']['Row'];

const MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

interface DeductionHistoryModalProps {
    expense: Expense;
    deductions: ExpenseDeduction[];
    onClose: () => void;
}

function DeductionHistoryModal({ expense, deductions, onClose }: DeductionHistoryModalProps) {
    const sorted = [...deductions].sort((a, b) => {
        if (b.deducted_year !== a.deducted_year) return b.deducted_year - a.deducted_year;
        return b.deducted_month - a.deducted_month;
    });

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Historique des déductions</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{expense.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    {sorted.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-8 italic">Aucune déduction enregistrée</p>
                    ) : (
                        <div className="space-y-2">
                            {sorted.map(d => (
                                <div key={d.id} className="flex items-center justify-between bg-slate-800 px-4 py-3 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                                        <span className="text-sm font-bold text-white">
                                            {MONTHS_FR[d.deducted_month - 1]} {d.deducted_year}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        {new Date(d.deducted_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function Expenses() {
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [deductions, setDeductions] = useState<ExpenseDeduction[]>([]);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [historyExpense, setHistoryExpense] = useState<Expense | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'one-shot' | 'monthly'>('all');
    const [deducting, setDeducting] = useState<string | null>(null);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    useEffect(() => {
        fetchAll();
    }, []);

    async function fetchAll() {
        try {
            setLoading(true);
            const [expensesRes, deductionsRes] = await Promise.all([
                supabase.from('expenses').select('*').order('date', { ascending: false }),
                supabase.from('expense_deductions').select('*').order('deducted_at', { ascending: false })
            ]);
            if (expensesRes.error) throw expensesRes.error;
            if (deductionsRes.error) throw deductionsRes.error;
            setExpenses(expensesRes.data || []);
            setDeductions(deductionsRes.data || []);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    }

    function isDeductedThisMonth(expenseId: string) {
        return deductions.some(
            d => d.expense_id === expenseId && d.deducted_month === currentMonth && d.deducted_year === currentYear
        );
    }

    function getDeductionsForExpense(expenseId: string) {
        return deductions.filter(d => d.expense_id === expenseId);
    }

    async function handleToggleDeduction(e: React.MouseEvent, expense: Expense) {
        e.stopPropagation();
        setDeducting(expense.id);
        try {
            const alreadyDeducted = isDeductedThisMonth(expense.id);
            if (alreadyDeducted) {
                const existing = deductions.find(
                    d => d.expense_id === expense.id && d.deducted_month === currentMonth && d.deducted_year === currentYear
                );
                if (existing) {
                    const { error } = await supabase
                        .from('expense_deductions')
                        .delete()
                        .eq('id', existing.id);
                    if (error) throw error;
                }
            } else {
                const { error } = await supabase
                    .from('expense_deductions')
                    .insert([{
                        expense_id: expense.id,
                        deducted_month: currentMonth,
                        deducted_year: currentYear
                    }]);
                if (error) throw error;
            }
            await fetchAll();
        } catch (error) {
            console.error('Error toggling deduction:', error);
            alert('Erreur lors de la mise à jour');
        } finally {
            setDeducting(null);
        }
    }

    async function handleDeleteExpense(e: React.MouseEvent, expense: Expense) {
        e.stopPropagation();
        if (!confirm('Voulez-vous vraiment supprimer cette dépense ?')) return;

        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expense.id);

            if (error) throw error;
            fetchAll();
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Erreur lors de la suppression');
        }
    }

    const filteredExpenses = expenses.filter(exp => {
        const matchesSearch = exp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || exp.type === filterType;
        return matchesSearch && matchesType;
    });

    const totalFiltered = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const deductedThisMonth = filteredExpenses.filter(exp => exp.type === 'monthly' && isDeductedThisMonth(exp.id));
    const totalDeductedThisMonth = deductedThisMonth.reduce((sum, exp) => sum + Number(exp.amount), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Clock className="animate-spin text-blue-500 mr-2" size={24} />
                <span className="text-slate-400 font-medium">Chargement des dépenses...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link to="/billing" className="text-slate-500 hover:text-white transition-colors">
                            <ArrowLeft size={16} />
                        </Link>
                        <h1 className="text-3xl font-bold text-white uppercase tracking-tighter">Gestion des Dépenses</h1>
                    </div>
                    <p className="text-slate-400 text-sm">Historique et suivi détaillé des coûts opérationnels</p>
                </div>
                <button
                    onClick={() => { setSelectedExpense(null); setIsExpenseModalOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-blue-900/40"
                >
                    <Plus size={20} />
                    <span>Nouvelle Dépense</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingDown size={48} className="text-rose-400" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1 tracking-widest">Total Affiché</p>
                    <h3 className="text-2xl font-black text-rose-400">-{totalFiltered.toLocaleString('fr-FR')} €</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 bg-slate-700/30 w-fit px-2 py-1 rounded-lg font-bold">
                        {filteredExpenses.length} Opérations
                    </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle2 size={48} className="text-emerald-400" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1 tracking-widest">Déduit ce mois</p>
                    <h3 className="text-2xl font-black text-emerald-400">-{totalDeductedThisMonth.toLocaleString('fr-FR')} €</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 bg-slate-700/30 w-fit px-2 py-1 rounded-lg font-bold">
                        {MONTHS_FR[currentMonth - 1]} {currentYear} — {deductedThisMonth.length} dépenses
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher une dépense ou catégorie..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-blue-500 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-700">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterType === 'all' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Tout
                    </button>
                    <button
                        onClick={() => setFilterType('one-shot')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterType === 'one-shot' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        One Shot
                    </button>
                    <button
                        onClick={() => setFilterType('monthly')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterType === 'monthly' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Mensuel
                    </button>
                </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-700">
                            <th className="px-6 py-4">Dépense</th>
                            <th className="px-6 py-4">Payé par</th>
                            <th className="px-6 py-4">Catégorie</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 text-right">Montant</th>
                            <th className="px-6 py-4 text-center">Mois en cours</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {filteredExpenses.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-20 text-center text-slate-500 italic text-sm">
                                    Aucune dépense trouvée
                                </td>
                            </tr>
                        ) : (
                            filteredExpenses.map(exp => {
                                const deducted = isDeductedThisMonth(exp.id);
                                const historyCount = getDeductionsForExpense(exp.id).length;
                                const isProcessing = deducting === exp.id;
                                return (
                                    <tr
                                        key={exp.id}
                                        onClick={() => { setSelectedExpense(exp); setIsExpenseModalOpen(true); }}
                                        className="hover:bg-slate-750 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <p className="text-sm font-bold text-white uppercase group-hover:text-blue-400 transition-colors">{exp.name}</p>
                                                {exp.is_deducted && (
                                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter mt-0.5">Déduit du profit</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${exp.paid_by === 'Noé' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                exp.paid_by === 'Baptiste' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                {exp.paid_by || 'Noé'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded uppercase border border-slate-700">
                                                {exp.category || 'Non classé'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 transition-all">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase border ${exp.type === 'monthly'
                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                : 'bg-slate-700/50 text-slate-400 border-slate-700'
                                                }`}>
                                                {exp.type === 'monthly' ? 'Mensuel' : 'One Shot'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <Calendar size={12} />
                                                {new Date(exp.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className={`text-sm font-black ${deducted ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                -{Number(exp.amount).toLocaleString('fr-FR')} €
                                            </p>
                                        </td>
                                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                            {exp.type === 'monthly' ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={(e) => handleToggleDeduction(e, exp)}
                                                        disabled={isProcessing}
                                                        title={deducted ? 'Annuler la déduction du mois' : 'Marquer comme déduit ce mois'}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${deducted
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                            : 'bg-slate-700/50 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                                                            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                    >
                                                        {isProcessing ? (
                                                            <Clock size={12} className="animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 size={12} />
                                                        )}
                                                        {deducted ? 'Déduit' : 'Déduire'}
                                                    </button>
                                                    {historyCount > 0 && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setHistoryExpense(exp); }}
                                                            title="Voir l'historique des déductions"
                                                            className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors relative"
                                                        >
                                                            <History size={14} />
                                                            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                                                                {historyCount}
                                                            </span>
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex justify-center">
                                                    <span className="text-[10px] text-slate-600 italic">—</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => handleDeleteExpense(e, exp)}
                                                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ExpenseModal
                isOpen={isExpenseModalOpen}
                expense={selectedExpense}
                onClose={() => setIsExpenseModalOpen(false)}
                onUpdate={fetchAll}
            />

            {historyExpense && (
                <DeductionHistoryModal
                    expense={historyExpense}
                    deductions={getDeductionsForExpense(historyExpense.id)}
                    onClose={() => setHistoryExpense(null)}
                />
            )}
        </div>
    );
}
