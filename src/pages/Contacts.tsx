import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { Search, Filter, Phone, Mail, Eye, Plus, Calendar, Trash2, Briefcase } from 'lucide-react';
import { StatusSelect } from '../components/StatusSelect';
import { NewContactModal } from '../components/NewContactModal';
import { ContactCardModal } from '../components/ContactCardModal';
import { ConvertToClientModal } from '../components/ConvertToClientModal';

type Contact = Database['public']['Tables']['contacts']['Row'] & {
    leads: Database['public']['Tables']['leads']['Row'] | null
};

export function Contacts() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    // Modal States
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [contactToConvert, setContactToConvert] = useState<Contact | null>(null);

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

    const filteredContacts = contacts.filter(contact =>
        contact.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleStatusUpdate = (contactId: string, newStatus: string) => {
        setContacts(prev => prev.map(c =>
            c.id === contactId ? { ...c, status: newStatus as any } : c
        ));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Contacts</h1>
                <button
                    onClick={() => setIsNewModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus size={20} />
                    Nouveau Contact
                </button>
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
                <button className="bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-700 transition-colors">
                    <Filter size={20} />
                    Filtres
                </button>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900/50 text-xs uppercase font-medium text-slate-300">
                            <tr>
                                <th className="px-6 py-4">Nom</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Téléphone</th>
                                <th className="px-6 py-4">Statut Pipeline</th>
                                <th className="px-6 py-4">Date du 1er closing</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chargement...</td>
                                </tr>
                            ) : filteredContacts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Aucun contact trouvé</td>
                                </tr>
                            ) : (
                                filteredContacts.map((contact) => (
                                    <tr key={contact.id} className="hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">
                                            {contact.nom}
                                        </td>
                                        <td className="px-6 py-4">
                                            {contact.email ? (
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <Mail size={14} className="text-slate-500" />
                                                    {contact.email}
                                                </div>
                                            ) : (
                                                <span className="text-slate-600 italic">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {contact.phone ? (
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <Phone size={14} className="text-slate-500" />
                                                    {contact.phone}
                                                </div>
                                            ) : (
                                                <span className="text-slate-600 italic">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusSelect
                                                currentStatus={contact.status}
                                                contactId={contact.id}
                                                onStatusChange={(newStatus) => handleStatusUpdate(contact.id, newStatus)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-600" />
                                                {contact.first_closing_date ? new Date(contact.first_closing_date).toLocaleDateString('fr-FR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric'
                                                }) : <span className="text-slate-600 italic text-xs">Non définie</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
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
