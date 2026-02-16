import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { Search, Filter, Phone, Mail, Eye, Target } from 'lucide-react';
import { ContactCardModal } from '../components/ContactCardModal';

type Contact = Database['public']['Tables']['contacts']['Row'] & {
    leads: Database['public']['Tables']['leads']['Row'] | null
};

export function Setter() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        fetchContacts();
    }, []);

    async function fetchContacts() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('contacts')
                .select('*, leads(*)')
                .eq('source', 's-i')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setContacts(data as Contact[] || []);
        } catch (error) {
            console.error('Error fetching setter contacts:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredContacts = useMemo(() => {
        return contacts.filter(contact => {
            const matchesSearch = contact.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [contacts, searchTerm, statusFilter]);

    // Stats for source s-i
    const stats = useMemo(() => {
        const total = contacts.length;
        const closed = contacts.filter(c => c.status === 'Closé').length;
        const rate = total > 0 ? (closed / total) * 100 : 0;
        return { total, closed, rate };
    }, [contacts]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-white">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Target className="text-blue-500" />
                        Setter (Source s-i)
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Consultation des contacts provenant du setter.</p>
                </div>
            </div>

            {/* Source Specific Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl">
                    <p className="text-slate-400 text-sm font-medium mb-1">Total Contacts s-i</p>
                    <h3 className="text-2xl font-bold text-white">{stats.total}</h3>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl">
                    <p className="text-slate-400 text-sm font-medium mb-1">Ventes (Closés)</p>
                    <h3 className="text-2xl font-bold text-emerald-400">{stats.closed}</h3>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl">
                    <p className="text-slate-400 text-sm font-medium mb-1">Taux de Conversion</p>
                    <h3 className="text-2xl font-bold text-blue-400">{stats.rate.toFixed(1)}%</h3>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher parmi les contacts s-i..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
                <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1">
                    <div className="flex items-center px-3 text-slate-400">
                        <Filter size={16} />
                    </div>
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

            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900/50 text-xs uppercase font-medium text-slate-300">
                            <tr>
                                <th className="px-6 py-4">Nom</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Téléphone</th>
                                <th className="px-6 py-4">Source</th>
                                <th className="px-6 py-4">Statut Pipeline</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">Chargement des données setter...</td>
                                </tr>
                            ) : filteredContacts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Aucun contact "s-i" trouvé</td>
                                </tr>
                            ) : (
                                filteredContacts.map((contact) => (
                                    <tr key={contact.id} className="hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-white uppercase tracking-tight">
                                            {contact.nom}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} className="text-slate-500" />
                                                {contact.email || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className="text-slate-500" />
                                                {contact.phone || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 max-w-[100px] truncate block"
                                                title={contact.source || 's-i'}
                                            >
                                                {contact.source || 's-i'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium">
                                            <span className={`px-3 py-1 rounded-full border ${contact.status === 'Closé' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                contact.status === 'Call planifié' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    contact.status === 'Pas budget' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        contact.status === 'A recontacter' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                }`}>
                                                {contact.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
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
