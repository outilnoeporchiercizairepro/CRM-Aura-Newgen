import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { Search, Filter, DollarSign, Wallet, Clock, CreditCard, CheckCircle, Calendar, AlertTriangle } from 'lucide-react';
import { ClientDetailsModal } from '../components/ClientDetailsModal';

type Client = Database['public']['Tables']['clients']['Row'] & {
    contacts: Database['public']['Tables']['contacts']['Row'] | null;
    client_installments: Database['public']['Tables']['client_installments']['Row'][];
};

export function Clients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    useEffect(() => {
        fetchClients();
    }, []);

    async function fetchClients() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('clients')
                .select('*, contacts(*), client_installments(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setClients(data as Client[] || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredClients = clients.filter(client =>
        client.contacts?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contacts?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // KPI Calculations
    const stats = clients.reduce((acc, client) => {
        const total = Number(client.deal_amount || 0);
        const paid = Number(client.amount_paid || 0);
        return {
            total: acc.total + total,
            paid: acc.paid + paid,
            pending: acc.pending + (total - paid)
        };
    }, { total: 0, paid: 0, pending: 0 });

    const getNextDueDate = (installments: Database['public']['Tables']['client_installments']['Row'][]) => {
        const pending = installments
            .filter(i => i.status === 'En attente')
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

        if (pending.length === 0) return null;
        return new Date(pending[0].due_date);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white uppercase tracking-tighter">Clients & Trésorerie</h1>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CreditCard size={64} className="text-blue-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium mb-1">CA Global</p>
                    <h3 className="text-2xl font-bold text-white">{stats.total.toLocaleString('fr-FR')} €</h3>
                    <div className="mt-4 flex items-center gap-2 text-xs text-blue-400 bg-blue-400/10 w-fit px-2 py-1 rounded-lg">
                        <DollarSign size={12} />
                        Total Deals Signés
                    </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet size={64} className="text-emerald-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium mb-1">CA Encaissé (Cash)</p>
                    <h3 className="text-2xl font-bold text-emerald-400">{stats.paid.toLocaleString('fr-FR')} €</h3>
                    <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 w-fit px-2 py-1 rounded-lg">
                        <CheckCircle size={12} />
                        Total Récupéré
                    </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={64} className="text-amber-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium mb-1">CA en Attente</p>
                    <h3 className="text-2xl font-bold text-amber-400">{stats.pending.toLocaleString('fr-FR')} €</h3>
                    <div className="mt-4 flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 w-fit px-2 py-1 rounded-lg">
                        <Clock size={12} />
                        Flux Futur Prévu
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher un client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
                <button className="bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-700 transition-colors">
                    <Filter size={20} />
                    Filtres
                </button>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900/50 text-xs uppercase font-bold text-slate-300">
                            <tr>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Deals & Paiements</th>
                                <th className="px-6 py-4">Prochaine Échéance</th>
                                <th className="px-6 py-4">Qui encaisse</th>
                                <th className="px-6 py-4 text-right pr-10">Gestion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">Chargement des données financières...</td>
                                </tr>
                            ) : filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Aucun client trouvé</td>
                                </tr>
                            ) : (
                                filteredClients.map((client) => {
                                    const total = Number(client.deal_amount);
                                    const paid = Number(client.amount_paid || 0);
                                    const pending = total - paid;
                                    const nextDue = getNextDueDate(client.client_installments);
                                    const isOverdue = nextDue && nextDue < new Date();

                                    return (
                                        <tr key={client.id} className="hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white uppercase tracking-tight">{client.contacts?.nom || 'Inconnu'}</div>
                                                <div className="text-[10px] text-slate-500">Signé le {new Date(client.created_at || '').toLocaleDateString('fr-FR')}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-bold">{total.toLocaleString('fr-FR')} €</span>
                                                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[9px] font-black text-slate-400 border border-slate-700">{client.payment_method}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px]">
                                                        <span className="text-emerald-400 font-bold">{paid.toLocaleString('fr-FR')} € reçu</span>
                                                        {pending > 0 && <span className="text-slate-500">• {pending.toLocaleString('fr-FR')} € restant</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {nextDue ? (
                                                    <div className={`flex items-center gap-2 font-medium ${isOverdue ? 'text-rose-400' : 'text-amber-400'}`}>
                                                        <Calendar size={14} />
                                                        <div className="flex flex-col">
                                                            <span className="text-xs uppercase font-bold tracking-tighter">
                                                                {nextDue.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                            </span>
                                                            {isOverdue && (
                                                                <span className="text-[9px] font-black bg-rose-500/20 px-1 rounded flex items-center gap-0.5">
                                                                    <AlertTriangle size={8} /> RETARD
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-emerald-500/50 italic text-[10px]">
                                                        <CheckCircle size={14} />
                                                        Soldé
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black text-white">
                                                        {client.closed_by?.charAt(0)}
                                                    </div>
                                                    <span className="text-xs text-slate-300 font-medium">{client.closed_by}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right pr-6">
                                                <button
                                                    onClick={() => setSelectedClient(client)}
                                                    className="bg-white/5 hover:bg-white text-white hover:text-slate-900 border border-white/10 px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-tighter"
                                                >
                                                    Gérer Finance
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

            {selectedClient && (
                <ClientDetailsModal
                    client={selectedClient}
                    isOpen={!!selectedClient}
                    onClose={() => setSelectedClient(null)}
                    onUpdate={fetchClients}
                />
            )}
        </div>
    );
}
