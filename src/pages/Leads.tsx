import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { Plus, Search, Filter } from 'lucide-react';

type Lead = Database['public']['Tables']['leads']['Row'];

export function Leads() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLeads();
    }, []);

    async function fetchLeads() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeads(data || []);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredLeads = leads.filter(lead =>
        lead.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Leads</h1>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <Plus size={20} />
                    Nouveau Lead
                </button>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher un lead..."
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
                                <th className="px-6 py-4">Provenance</th>
                                <th className="px-6 py-4">Réseau Social</th>
                                <th className="px-6 py-4">Assigné à</th>
                                <th className="px-6 py-4">Date création</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chargement...</td>
                                </tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Aucun lead trouvé</td>
                                </tr>
                            ) : (
                                filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">
                                            {lead.prenom} {lead.nom}
                                        </td>
                                        <td className="px-6 py-4">{lead.email || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                {lead.provenance || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.social_media ? (
                                                <span className="flex items-center gap-1">
                                                    {lead.social_media}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            {lead.assigned_to ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white">
                                                        {lead.assigned_to.charAt(0)}
                                                    </div>
                                                    {lead.assigned_to}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(lead.created_at || '').toLocaleDateString('fr-FR')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
