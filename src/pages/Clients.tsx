import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { Search, Filter, DollarSign, Wallet, Clock, CreditCard, CheckCircle, Calendar, AlertTriangle, Trash2, TrendingUp, RefreshCw } from 'lucide-react';
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
    const [showFilters, setShowFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState('Tous');
    const [memberFilter, setMemberFilter] = useState('Tous');
    const [platformFilter, setPlatformFilter] = useState('Tous');

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

    async function handleDeleteClient(e: React.MouseEvent, client: Client) {
        e.stopPropagation();
        if (!confirm("Voulez-vous vraiment supprimer ce client ? Toutes les données associées seront DEFINITIVEMENT supprimées.")) return;

        try {
            // First delete installments (cascade should handle it, but for safety)
            const { error: instError } = await supabase
                .from('client_installments')
                .delete()
                .eq('client_id', client.id);

            if (instError) throw instError;

            const { error: clientError } = await supabase
                .from('clients')
                .delete()
                .eq('id', client.id);

            if (clientError) throw clientError;
            fetchClients();
        } catch (error) {
            console.error('Error deleting client:', error);
            alert('Erreur lors de la suppression');
        }
    }

    const filteredClients = clients
        .filter(client => {
            const matchesSearch = client.contacts?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.contacts?.email?.toLowerCase().includes(searchTerm.toLowerCase());

            const inst = client.client_installments || [];
            const hasPending = inst.some(i => i.status === 'En attente' || !i.status);
            const hasTransit = inst.some(i => i.status === 'En transit');
            const isFullyPaid = inst.length > 0 && inst.every(i => i.status === 'Payé');

            let matchesStatus = true;
            if (statusFilter === 'En attente') matchesStatus = hasPending;
            else if (statusFilter === 'En transit') matchesStatus = hasTransit;
            else if (statusFilter === 'Payé') matchesStatus = isFullyPaid;

            const matchesMember = memberFilter === 'Tous' || client.closed_by === memberFilter;
            const matchesPlatform = platformFilter === 'Tous' || client.billing_platform === platformFilter;

            return matchesSearch && matchesStatus && matchesMember && matchesPlatform;
        })
        .sort((a, b) => {
            const getPriority = (client: Client) => {
                const inst = client.client_installments || [];
                const hasPending = inst.some(i => i.status === 'En attente' || !i.status);
                const hasTransit = inst.some(i => i.status === 'En transit');

                if (inst.length === 0) {
                    const total = Number(client.deal_amount || 0);
                    const paid = Number(client.amount_paid || 0);
                    return (total - paid > 0) ? 0 : 2;
                }

                if (hasPending) return 0;
                if (hasTransit) return 1;
                return 2;
            };
            return getPriority(a) - getPriority(b);
        });

    // KPI Calculations
    const stats = clients.reduce((acc, client) => {
        const total = Number(client.deal_amount || 0);

        // Primary source: installments
        const inst = client.client_installments || [];
        const hasInst = inst.length > 0;

        const paid = hasInst
            ? inst.filter(i => i.status === 'Payé').reduce((sum, i) => sum + Number(i.amount), 0)
            : Number(client.amount_paid || 0);

        const transit = inst.filter(i => i.status === 'En transit').reduce((sum, i) => sum + Number(i.amount), 0);

        const pending = hasInst
            ? inst.filter(i => i.status === 'En attente' || !i.status).reduce((sum, i) => sum + Number(i.amount), 0)
            : Math.max(0, total - paid - transit);

        return {
            total: acc.total + total,
            paid: acc.paid + paid,
            transit: acc.transit + transit,
            pending: acc.pending + pending
        };
    }, { total: 0, paid: 0, transit: 0, pending: 0 });

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        <TrendingUp size={64} className="text-indigo-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium mb-1">CA en Transit (Mollie/Revo)</p>
                    <h3 className="text-2xl font-bold text-indigo-400">{stats.transit.toLocaleString('fr-FR')} €</h3>
                    <div className="mt-4 flex items-center gap-2 text-xs text-indigo-400 bg-indigo-400/10 w-fit px-2 py-1 rounded-lg">
                        <RefreshCw size={12} className="animate-spin-slow" />
                        Paiements validés non reçus
                    </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={64} className="text-amber-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium mb-1">CA en Attente (Relances)</p>
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
                <div className="relative">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`bg-slate-800 border px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${showFilters || statusFilter !== 'Tous' || memberFilter !== 'Tous' || platformFilter !== 'Tous'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        <Filter size={20} />
                        Filtres {(statusFilter !== 'Tous' || memberFilter !== 'Tous' || platformFilter !== 'Tous') && "Active"}
                    </button>

                    {showFilters && (
                        <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 p-4 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Statut Paiement</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Tous', 'Payé', 'En transit', 'En attente'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setStatusFilter(s)}
                                            className={`text-[10px] py-1 px-2 rounded-lg border font-bold transition-all ${statusFilter === s
                                                ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                                : 'border-slate-700 text-slate-400 hover:border-slate-600'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Membre</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Tous', 'Noé', 'Imrane', 'Baptiste'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setMemberFilter(m)}
                                            className={`text-[10px] py-1 px-2 rounded-lg border font-bold transition-all ${memberFilter === m
                                                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                                : 'border-slate-700 text-slate-400 hover:border-slate-600'
                                                }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Plateforme</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Tous', 'Mollie', 'Revolut', 'GoCardless'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPlatformFilter(p)}
                                            className={`text-[10px] py-1 px-2 rounded-lg border font-bold transition-all ${platformFilter === p
                                                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                                                : 'border-slate-700 text-slate-400 hover:border-slate-600'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {(statusFilter !== 'Tous' || memberFilter !== 'Tous' || platformFilter !== 'Tous') && (
                                <button
                                    onClick={() => {
                                        setStatusFilter('Tous');
                                        setMemberFilter('Tous');
                                        setPlatformFilter('Tous');
                                    }}
                                    className="w-full py-2 text-[10px] font-black uppercase text-rose-400 hover:text-rose-300 transition-colors border-t border-slate-700 mt-2 pt-2"
                                >
                                    Effacer les filtres
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900/50 text-xs uppercase font-bold text-slate-300">
                            <tr>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Deals & Paiements</th>
                                <th className="px-6 py-4">Prochaine Échéance</th>
                                <th className="px-6 py-4 text-center">Plateforme</th>
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
                                        <tr key={client.id} className="hover:bg-slate-700/50 transition-colors group">
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
                                                ) : client.client_installments?.some(i => i.status === 'En transit') ? (
                                                    <div className="flex items-center gap-2 text-purple-400 font-bold italic text-[10px]">
                                                        <RefreshCw size={14} className="animate-spin-slow" />
                                                        En transit
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-emerald-500/50 italic text-[10px]">
                                                        <CheckCircle size={14} />
                                                        Soldé
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black border ${client.billing_platform === 'Mollie' ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10' :
                                                    client.billing_platform === 'Revolut' ? 'border-pink-500/50 text-pink-400 bg-pink-500/10' :
                                                        'border-blue-500/50 text-blue-400 bg-blue-500/10'
                                                    }`}>
                                                    {client.billing_platform || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${client.closed_by === 'Noé' ? 'bg-blue-600' :
                                                        client.closed_by === 'Imrane' ? 'bg-amber-600' :
                                                            client.closed_by === 'Baptiste' ? 'bg-emerald-600' :
                                                                'bg-slate-600'
                                                        }`}>
                                                        {client.closed_by?.charAt(0)}
                                                    </div>
                                                    <span className="text-xs text-slate-300 font-medium">{client.closed_by}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right pr-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedClient(client)}
                                                        className="bg-white/5 hover:bg-white text-white hover:text-slate-900 border border-white/10 px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-tighter"
                                                    >
                                                        Gérer Finance
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteClient(e, client)}
                                                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                                                        title="Supprimer le client"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
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
