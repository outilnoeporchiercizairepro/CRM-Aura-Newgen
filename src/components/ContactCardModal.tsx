import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { X, Save, Trash2, Loader2, Link as LinkIcon, Info, FileText, StickyNote } from 'lucide-react';

type Contact = Database['public']['Tables']['contacts']['Row'] & {
    leads: Database['public']['Tables']['leads']['Row'] | null
};

type JobStatus = Database['public']['Enums']['job_status_enum'];

interface Props {
    contact: Contact;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    readOnly?: boolean;
}

const JOB_STATUSES: JobStatus[] = ['Entrepreneur', 'Demandeur d\'emploi', 'Etudiant', 'Salarié'];

export function ContactCardModal({ contact, isOpen, onClose, onUpdate, readOnly = false }: Props) {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'presentation' | 'notes'>('info');
    const [formData, setFormData] = useState({
        nom: contact.nom,
        email: contact.email || '',
        phone: contact.phone || '',
        job_status: contact.job_status || null,
        first_closing_date: contact.first_closing_date || '',
        presentation: contact.presentation || '',
        notes: contact.notes || '',
        source: contact.source || ''
    });

    // Reset form when contact changes
    useEffect(() => {
        setFormData({
            nom: contact.nom,
            email: contact.email || '',
            phone: contact.phone || '',
            job_status: contact.job_status || null,
            first_closing_date: contact.first_closing_date || '',
            presentation: contact.presentation || '',
            notes: contact.notes || '',
            source: contact.source || ''
        });
    }, [contact]);

    if (!isOpen) return null;

    async function handleSave() {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('contacts')
                .update({
                    nom: formData.nom,
                    email: formData.email,
                    phone: formData.phone,
                    job_status: formData.job_status,
                    first_closing_date: formData.first_closing_date || null,
                    presentation: formData.presentation,
                    notes: formData.notes,
                    source: formData.source
                })
                .eq('id', contact.id);

            if (error) throw error;
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating contact:', error);
            alert('Erreur lors de la mise à jour');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('contacts').delete().eq('id', contact.id);
            if (error) throw error;
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('Erreur lors de la suppression');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

            {/* Slide-over Panel */}
            <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white">{formData.nom}</h2>
                        <p className="text-sm text-slate-400">Fiche Contact</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div className="border-b border-slate-800 bg-slate-900/30">
                    <div className="flex gap-1 px-6">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${activeTab === 'info'
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            <Info size={16} />
                            Informations
                        </button>
                        <button
                            onClick={() => setActiveTab('presentation')}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${activeTab === 'presentation'
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            <FileText size={16} />
                            Présentation
                        </button>
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${activeTab === 'notes'
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            <StickyNote size={16} />
                            Notes Internes
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Tab: Informations */}
                    {activeTab === 'info' && (
                        <div className="space-y-6">
                            {/* Matched Lead Info */}
                            {contact.leads ? (
                                <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2 text-blue-400">
                                        <LinkIcon size={16} />
                                        <h3 className="font-semibold text-sm uppercase tracking-wide">Lead Associé</h3>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-white font-medium">{contact.leads.prenom} {contact.leads.nom}</p>
                                            <p className="text-sm text-slate-400">Source: <span className="text-slate-300">{contact.leads.provenance}</span></p>
                                        </div>
                                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                                            {contact.leads.social_media || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                                    <span className="text-slate-400 text-sm">Aucun lead associé</span>
                                    {/* Could add a manual link button here later */}
                                </div>
                            )}

                            {/* Main Fields */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            disabled={readOnly}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Téléphone</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            disabled={readOnly}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Statut Pro</label>
                                        <select
                                            value={formData.job_status || ''}
                                            onChange={(e) => setFormData({ ...formData, job_status: e.target.value as any })}
                                            disabled={readOnly}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">Sélectionner...</option>
                                            {JOB_STATUSES.map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Date du 1er closing</label>
                                        <input
                                            type="date"
                                            value={formData.first_closing_date}
                                            onChange={(e) => setFormData({ ...formData, first_closing_date: e.target.value })}
                                            disabled={readOnly}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Source</label>
                                    <input
                                        type="text"
                                        value={formData.source}
                                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                        disabled={readOnly}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="Lien direct (par défaut)"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: Présentation */}
                    {activeTab === 'presentation' && (
                        <div className="space-y-4">
                            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                                <p className="text-xs text-slate-400 mb-3">
                                    💡 Utilisez cet espace pour noter le pitch, la bio, ou toute présentation du contact.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase mb-2">Présentation du Contact</label>
                                <textarea
                                    rows={18}
                                    value={formData.presentation}
                                    onChange={(e) => setFormData({ ...formData, presentation: e.target.value })}
                                    disabled={readOnly}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
                                    placeholder="Pitch ou bio du contact...\n\nVous pouvez écrire autant que nécessaire ici."
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    {formData.presentation.length} caractères
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Tab: Notes Internes */}
                    {activeTab === 'notes' && (
                        <div className="space-y-4">
                            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                                <p className="text-xs text-slate-400 mb-3">
                                    📝 Notes privées pour le suivi interne : rendez-vous, relances, observations, etc.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase mb-2">Notes Internes</label>
                                <textarea
                                    rows={18}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    disabled={readOnly}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
                                    placeholder="Notes de rendez-vous, suivi, etc...\n\nCes notes sont privées et ne seront pas visibles par le contact."
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    {formData.notes.length} caractères
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {!readOnly && (
                    <div className="p-6 border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <button
                            onClick={handleDelete}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Supprimer
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Enregistrer
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
