import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { Search, Filter, Eye, Linkedin, TrendingUp } from 'lucide-react';
import { ContactCardModal } from '../components/ContactCardModal';

type Contact = Database['public']['Tables']['contacts']['Row'] & {
    leads: Database['public']['Tables']['leads']['Row'] | null
};

const LINKEDIN_SOURCES = ['s-l-n', 's-l-b', 's-l-i'];

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
    's-l-n': { label: 'Noé', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    's-l-b': { label: 'Baptiste', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    's-l-i': { label: 'Imrane', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
};

type CommissionData = {
    totalCommission: number;
    monthCommission: number;
};

export function SetterLinkedin() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [commissionData, setCommissionData] = useState<CommissionData>({ totalCommission: 0, monthCommission: 0 });

    useEffect(() => {
        fetchContacts();
        fetchCommissions();
    }, []);

    async function fetchContacts() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('contacts')
                .select('*, leads(*)')
                .in('source', LINKEDIN_SOURCES)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setContacts(data as Contact[] || []);
        } catch (error) {
            console.error('Error fetching linkedin setter contacts:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchCommissions() {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('deal_amount, setter_commission_percentage, created_at, contacts(source)')
                .not('setter_commission_percentage', 'is', null)
                .gt('setter_commission_percentage', 0);

            if (error) throw error;

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            let total = 0;
            let month = 0;

            for (const client of data || []) {
                const source = (client.contacts as any)?.source;
                if (!LINKEDIN_SOURCES.includes(source)) continue;
                const commission = (Number(client.deal_amount) * Number(client.setter_commission_percentage)) / 100;
                total += commission;
                const clientDate = new Date(client.created_at!);
                if (clientDate.getMonth() === currentMonth && clientDate.getFullYear() === currentYear) {
                    month += commission;
                }
            }

            setCommissionData({ totalCommission: total, monthCommission: month });
        } catch (error) {
            console.error('Error fetching commissions:', error);
        }
    }

    const filteredContacts = useMemo(() => {
        return contacts.filter(contact => {
            const matchesSearch =
                contact.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
            const matchesSource = sourceFilter === 'all' || contact.source === sourceFilter;
            return matchesSearch && matchesStatus && matchesSource;
        });
    }, [contacts, searchTerm, statusFilter, sourceFilter]);

    const stats = useMemo(() => {
        const total = contacts.length;
        const closed = contacts.filter(c => c.status === 'Closé').length;
        const rate = total > 0 ? (closed / total) * 100 : 0;
        const bySource = LINKEDIN_SOURCES.reduce((acc, src) => {
            acc[src] = contacts.filter(c => c.source === src).length;
            return acc;
        }, {} as Record<string, number>);
        return { total, closed, rate, bySource };
    }, [contacts]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-white">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Linkedin className="text-blue-400" />
                        Setter LinkedIn
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Contacts provenant des sources LinkedIn (s-l-n, s-l-b, s-l-i)</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl">
                    <p className="text-slate-400 text-xs font-medium mb-1 uppercase tracking-wide">Total contacts</p>
                    <h3 className="text-2xl font-bold text-white">{stats.total}</h3>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl">
                    <p className="text-slate-400 text-xs font-medium mb-1 uppercase tracking-wide">Ventes (Closés)</p>
                    <h3 className="text-2xl font-bold text-emerald-400">{stats.closed}</h3>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl">
                    <p className="text-slate-400 text-xs font-medium mb-1 uppercase tracking-wide">Taux conversion</p>
                    <h3 className="text-2xl font-bold text-blue-400">{stats.rate.toFixed(1)}%</h3>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl">
                    <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Par source</p>
                    <div className="flex flex-col gap-1">
                        {LINKEDIN_SOURCES.map(src => (
                            <div key={src} className="flex items-center justify-between">
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${SOURCE_LABELS[src].color}`}>
                                    {src}
                                </span>
                                <span className="text-xs font-bold text-white">{stats.bySource[src]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/30 to-slate-800 border border-blue-500/20 p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={18} className="text-blue-400" />
                    <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">Commissions LinkedIn</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs text-slate-400 font-medium mb-1">Total gagné (tout temps)</p>
                        <p className="text-3xl font-black text-white">
                            {commissionData.totalCommission.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-medium mb-1">Ce mois-ci</p>
                        <p className="text-3xl font-black text-blue-400">
                            {commissionData.monthCommission.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher parmi les contacts LinkedIn..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-sm"
                    />
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1">
                        <div className="flex items-center px-2 text-slate-400">
                            <Filter size={15} />
                        </div>
                        <select
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            className="bg-transparent text-white px-2 py-1 text-sm focus:outline-none cursor-pointer"
                        >
                            <option value="all" className="bg-slate-800">Toutes les sources</option>
                            {LINKEDIN_SOURCES.map(src => (
                                <option key={src} value={src} className="bg-slate-800">{src} — {SOURCE_LABELS[src].label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-transparent text-white px-2 py-1 text-sm focus:outline-none cursor-pointer"
                        >
                            <option value="all" className="bg-slate-800">Tous les statuts</option>
                            <option value="Call planifié" className="bg-slate-800">Call planifié</option>
                            <option value="A recontacter" className="bg-slate-800">A recontacter</option>
                            <option value="Closé" className="bg-slate-800">Closé</option>
                            <option value="Attente paiement" className="bg-slate-800">Attente paiement</option>
                            <option value="Attente retour" className="bg-slate-800">Attente retour</option>
                            <option value="Pas venu" className="bg-slate-800">Pas venu</option>
                            <option value="Pas budget" className="bg-slate-800">Pas budget</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400 min-w-[600px]">
                        <thead className="bg-slate-900/50 text-xs uppercase font-medium text-slate-300">
                            <tr>
                                <th className="px-4 py-3">Nom</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Téléphone</th>
                                <th className="px-4 py-3">Source</th>
                                <th className="px-4 py-3">Statut Pipeline</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">Chargement des contacts LinkedIn...</td>
                                </tr>
                            ) : filteredContacts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Aucun contact LinkedIn trouvé</td>
                                </tr>
                            ) : (
                                filteredContacts.map((contact) => (
                                    <tr key={contact.id} className="hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-white uppercase tracking-tight whitespace-nowrap">
                                            {contact.nom}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-300 text-xs truncate max-w-[150px] block" title={contact.email || ''}>
                                                {contact.email || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">
                                            {contact.phone || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {contact.source ? (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${SOURCE_LABELS[contact.source]?.color ?? 'bg-slate-700/50 text-slate-400 border-slate-700'}`}>
                                                    {contact.source}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-medium">
                                            <span className={`px-3 py-1 rounded-full border ${
                                                contact.status === 'Closé' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                contact.status === 'Call planifié' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                contact.status === 'Pas budget' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                contact.status === 'A recontacter' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                contact.status === 'Attente paiement' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                                                contact.status === 'Attente retour' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                            }`}>
                                                {contact.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedContact(contact)}
                                                    className="text-slate-400 hover:text-blue-400 p-2 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    title="Voir la fiche"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedContact && (
                <ContactCardModal
                    contact={selectedContact}
                    isOpen={!!selectedContact}
                    onClose={() => setSelectedContact(null)}
                    onUpdate={fetchContacts}
                    readOnly={true}
                />
            )}
        </div>
    );
}
