import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import {
    Plus,
    TrendingDown,
    Calendar,
    Clock,
    Search,
    ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ExpenseModal } from '../components/ExpenseModal';

type Expense = Database['public']['Tables']['expenses']['Row'];

export function Expenses() {
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'one-shot' | 'monthly'>('all');

    useEffect(() => {
        fetchExpenses();
    }, []);

    async function fetchExpenses() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;
            setExpenses(data || []);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredExpenses = expenses.filter(exp => {
        const matchesSearch = exp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || exp.type === filterType;
        return matchesSearch && matchesType;
    });

    const totalFiltered = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

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

            {/* Stats Summary */}
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
            </div>

            {/* Filters */}
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
                            <th className="px-6 py-4">Catégorie</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 text-right">Montant</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {filteredExpenses.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center text-slate-500 italic text-sm">
                                    Aucune dépense trouvée
                                </td>
                            </tr>
                        ) : (
                            filteredExpenses.map(exp => (
                                <tr
                                    key={exp.id}
                                    onClick={() => { setSelectedExpense(exp); setIsExpenseModalOpen(true); }}
                                    className="hover:bg-slate-750 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-white uppercase group-hover:text-blue-400 transition-colors">{exp.name}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded uppercase border border-slate-700">
                                            {exp.category || 'Non classé'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 transition-all">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase border ${exp.type === 'monthly'
                                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
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
                                        <p className="text-sm font-black text-rose-400">-{Number(exp.amount).toLocaleString('fr-FR')} €</p>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <ExpenseModal
                isOpen={isExpenseModalOpen}
                expense={selectedExpense}
                onClose={() => setIsExpenseModalOpen(false)}
                onUpdate={fetchExpenses}
            />
        </div>
    );
}
