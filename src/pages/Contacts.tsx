import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { Search, Filter, Eye, Plus, Calendar, Trash2, Briefcase, Users, TrendingUp, AlertCircle, Wallet, PieChart as PieChartIcon, BarChart3 as BarChartIcon } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { StatusSelect } from '../components/StatusSelect';
import { PipelineStatusSelect } from '../components/PipelineStatusSelect';
import { NewContactModal } from '../components/NewContactModal';
import { ContactCardModal } from '../components/ContactCardModal';
import { ConvertToClientModal } from '../components/ConvertToClientModal';

type Contact = Database['public']['Tables']['contacts']['Row'] & {
    leads: Database['public']['Tables']['leads']['Row'] | null
};

type PipelineStatus = Database['public']['Enums']['pipeline_status_enum'];

export function Contacts() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    // Modal States
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [contactToConvert, setContactToConvert] = useState<Contact | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [todayOnly, setTodayOnly] = useState(false);

    useEffect(() => {
        fetchContacts();
    }, []);

    async function fetchContacts() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('contacts')
                .select('*, leads(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setContacts(data as Contact[] || []);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(contactId: string) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) return;

        try {
            const { error } = await supabase.from('contacts').delete().eq('id', contactId);
            if (error) throw error;
            // Optimistic update
            setContacts(prev => prev.filter(c => c.id !== contactId));
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('Erreur lors de la suppression');
        }
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const filteredContacts = useMemo(() => {
        return contacts.filter(contact => {
            const matchesSearch = contact.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
            const matchesToday = !todayOnly || contact.r1_date === todayStr;
            return matchesSearch && matchesStatus && matchesToday;
        });
    }, [contacts, searchTerm, statusFilter, todayOnly, todayStr]);

    const handleStatusUpdate = (contactId: string, newStatus: string) => {
        setContacts(prev => prev.map(c =>
            c.id === contactId ? { ...c, status: newStatus as any } : c
        ));
    };

    const handlePipelineUpdate = (contactId: string, newStatus: string) => {
        setContacts(prev => prev.map(c =>
            c.id === contactId ? { ...c, pipeline_status: newStatus as any } : c
        ));
    };

    // Dashboard Calculations
    const stats = useMemo(() => {
        const total = contacts.length;
        const closed = contacts.filter(c => c.status === 'Closé').length;
        const scheduled = contacts.filter(c => c.status === 'Call planifié').length;
        const noShowCount = contacts.filter(c => c.status === 'Pas venu').length;
        const noBudgetCount = contacts.filter(c => c.status === 'Pas budget').length;

        const convRate = total > 0 ? (closed / total) * 100 : 0;
        const nSRate = total > 0 ? (noShowCount / total) * 100 : 0;

        const appointments = contacts.filter(c =>
            ['Call planifié', 'Closé', 'Pas venu', 'Pas budget', 'Attente paiement', 'Attente retour'].includes(c.status || '')
        ).length;
        const nBRate = appointments > 0 ? (noBudgetCount / appointments) * 100 : 0;

        return {
            total,
            closed,
            scheduled,
            noShow: noShowCount,
            noBudget: noBudgetCount,
            convRate,
            nSRate,
            nBRate
        };
    }, [contacts]);

    // Charts Data
    const chartsData = useMemo(() => {
        const statusDist = [
            { name: 'Closé', value: stats.closed, color: '#10b981' },
            { name: 'Call planifié', value: stats.scheduled, color: '#3b82f6' },
            { name: 'Pas venu', value: stats.noShow, color: '#ef4444' },
            { name: 'Pas budget', value: stats.noBudget, color: '#f59e0b' },
            { name: 'Autres', value: stats.total - (stats.closed + stats.scheduled + stats.noShow + stats.noBudget), color: '#64748b' }
        ].filter(d => d.value > 0);

        const last7 = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        }).reverse();

        const byDate = last7.map(dateStr => {
            const count = contacts.filter(c => {
                if (!c.created_at) return false;
                const d = new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                return d === dateStr;
            }).length;
            return { date: dateStr, count };
        });

        return { statusDist, byDate };
    }, [contacts, stats]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Contacts</h1>
                <button
                    onClick={() => setIsNewModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
                >
                    <Plus size={20} />
                    Nouveau Contact
                </button>
            </div>

            {/* Dashboard Section */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Users size={32} className="text-blue-400" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wider">Total Contacts</p>
                    <h3 className="text-xl font-bold text-white leading-none">{stats.total}</h3>
                    <div className="mt-2 text-[9px] text-blue-400/60 font-medium">Flux Global</div>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp size={32} className="text-emerald-400" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wider">Clients Closés</p>
                    <h3 className="text-xl font-bold text-emerald-400 leading-none">{stats.closed}</h3>
                    <div className="mt-2 text-[9px] text-emerald-400/60 font-medium">{stats.convRate.toFixed(1)}% Conv.</div>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Calendar size={32} className="text-blue-400" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wider">Calls Planifiés</p>
                    <h3 className="text-xl font-bold text-blue-400 leading-none">{stats.scheduled}</h3>
                    <div className="mt-2 text-[9px] text-blue-400/60 font-medium">Pipeline actif</div>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <AlertCircle size={32} className="text-red-400" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wider">No-Shows</p>
                    <h3 className="text-xl font-bold text-red-400 leading-none">{stats.noShow}</h3>
                    <div className="mt-2 text-[9px] text-red-400/60 font-medium">{stats.nSRate.toFixed(1)}% Taux</div>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Wallet size={32} className="text-amber-400" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wider">Pas de Budget</p>
                    <h3 className="text-xl font-bold text-amber-400 leading-none">{stats.noBudget}</h3>
                    <div className="mt-2 text-[9px] text-amber-400/60 font-medium">{stats.nBRate.toFixed(1)}% Taux</div>
                </div>

                <div className="bg-emerald-500/10 border-2 border-emerald-500/20 p-4 rounded-xl relative overflow-hidden group ring-1 ring-emerald-500/30">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={32} className="text-emerald-500" />
                    </div>
                    <p className="text-emerald-400 text-[10px] font-bold mb-1 uppercase tracking-wider">Taux Conversion</p>
                    <h3 className="text-2xl font-black text-emerald-400 leading-none">{stats.convRate.toFixed(1)}%</h3>
                    <div className="mt-2 text-[9px] text-emerald-400/80 font-bold uppercase tracking-tighter italic">KPI Performance</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl">
                    <h3 className="text-sm font-semibold text-slate-300 mb-6 uppercase tracking-wider flex items-center gap-2">
                        <BarChartIcon size={16} className="text-blue-400" />
                        Nouveaux Contacts (7j)
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartsData.byDate}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl">
                    <h3 className="text-sm font-semibold text-slate-300 mb-6 uppercase tracking-wider flex items-center gap-2">
                        <PieChartIcon size={16} className="text-emerald-400" />
                        Répartition des Statuts
                    </h3>
                    <div className="h-[250px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartsData.statusDist}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartsData.statusDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>



            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher un contact..."
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

                <button
                    onClick={() => setTodayOnly(prev => !prev)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        todayOnly
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                >
                    <Calendar size={16} />
                    Calls du jour
                    {todayOnly && (
                        <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                            {filteredContacts.length}
                        </span>
                    )}
                </button>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400 min-w-[900px]">
                        <thead className="bg-slate-900/50 text-xs uppercase font-medium text-slate-300">
                            <tr>
                                <th className="px-3 py-3">Nom</th>
                                <th className="px-3 py-3">Email</th>
                                <th className="px-3 py-3">Téléphone</th>
                                <th className="px-3 py-3">Statut Contact</th>
                                <th className="px-3 py-3">Pipeline</th>
                                <th className="px-3 py-3">Source</th>
                                <th className="px-3 py-3">R1</th>
                                <th className="px-3 py-3">R2</th>
                                <th className="px-3 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-8 text-center text-slate-500">Chargement...</td>
                                </tr>
                            ) : filteredContacts.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-8 text-center text-slate-500">Aucun contact trouvé</td>
                                </tr>
                            ) : (
                                filteredContacts.map((contact) => (
                                    <tr key={contact.id} className="hover:bg-slate-700/50 transition-colors">
                                        <td className="px-3 py-3 font-medium text-white whitespace-nowrap">
                                            {contact.nom}
                                        </td>
                                        <td className="px-3 py-3">
                                            {contact.email ? (
                                                <span className="text-slate-300 text-xs truncate max-w-[140px] block" title={contact.email}>
                                                    {contact.email}
                                                </span>
                                            ) : (
                                                <span className="text-slate-600 italic">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            {contact.phone ? (
                                                <span className="text-slate-300 text-xs whitespace-nowrap">{contact.phone}</span>
                                            ) : (
                                                <span className="text-slate-600 italic">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <StatusSelect
                                                currentStatus={contact.status}
                                                contactId={contact.id}
                                                onStatusChange={(newStatus) => handleStatusUpdate(contact.id, newStatus)}
                                            />
                                        </td>
                                        <td className="px-3 py-3">
                                            <PipelineStatusSelect
                                                currentStatus={contact.pipeline_status as PipelineStatus ?? 'prospect'}
                                                contactId={contact.id}
                                                onStatusChange={(newStatus) => handlePipelineUpdate(contact.id, newStatus)}
                                            />
                                        </td>
                                        <td className="px-3 py-3">
                                            <span
                                                className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 max-w-[90px] truncate block"
                                                title={contact.source || 'Lien direct'}
                                            >
                                                {contact.source || 'Lien direct'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-slate-400 whitespace-nowrap">
                                            {contact.r1_date ? (
                                                <span className="text-blue-300 text-xs font-medium">
                                                    {new Date(contact.r1_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                </span>
                                            ) : <span className="text-slate-600 italic text-xs">-</span>}
                                        </td>
                                        <td className="px-3 py-3 text-slate-400 whitespace-nowrap">
                                            {contact.r2_date ? (
                                                <span className="text-teal-300 text-xs font-medium">
                                                    {new Date(contact.r2_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                </span>
                                            ) : <span className="text-slate-600 italic text-xs">-</span>}
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setContactToConvert(contact)}
                                                    className="text-emerald-400 hover:text-emerald-300 transition-colors p-2 hover:bg-emerald-500/10 rounded-lg group"
                                                    title="Convertir en client"
                                                >
                                                    <Briefcase size={18} className="group-hover:scale-110 transition-transform" />
                                                </button>
                                                <button
                                                    onClick={() => setSelectedContact(contact)}
                                                    className="text-slate-400 hover:text-blue-400 transition-colors p-2 hover:bg-blue-500/10 rounded-lg group"
                                                    title="Voir la fiche"
                                                >
                                                    <Eye size={18} className="group-hover:scale-110 transition-transform" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(contact.id)}
                                                    className="text-slate-400 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg group"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
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

            <NewContactModal
                isOpen={isNewModalOpen}
                onClose={() => setIsNewModalOpen(false)}
                onSuccess={fetchContacts}
            />

            {selectedContact && (
                <ContactCardModal
                    contact={selectedContact}
                    isOpen={!!selectedContact}
                    onClose={() => setSelectedContact(null)}
                    onUpdate={() => {
                        fetchContacts();
                        setSelectedContact(null);
                    }}
                />
            )}

            {contactToConvert && (
                <ConvertToClientModal
                    contact={contactToConvert}
                    isOpen={!!contactToConvert}
                    onClose={() => setContactToConvert(null)}
                    onSuccess={() => {
                        fetchContacts();
                    }}
                />
            )}
        </div>
    );
}
