import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2 } from 'lucide-react';
import type { Database } from '../types/supabase';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function NewContactModal({ isOpen, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nom: '',
        email: '',
        phone: '',
        status: 'Call planifié' as Database['public']['Enums']['contact_status_enum']
    });

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Try to find a matching lead by email
            let leadId = null;
            if (formData.email) {
                const { data: leads } = await supabase
                    .from('leads')
                    .select('id')
                    .eq('email', formData.email)
                    .limit(1);

                if (leads && leads.length > 0) {
                    leadId = leads[0].id;
                }
            }

            // 2. Insert the new contact
            const { error } = await supabase.from('contacts').insert([{
                ...formData,
                lead_id: leadId // Supabase will handle null if no lead found (relationship is optional)
            }]);

            if (error) throw error;

            onSuccess();
            onClose();
            setFormData({ nom: '', email: '', phone: '', status: 'Call planifié' });
        } catch (error) {
            console.error('Error creating contact:', error);
            alert('Erreur lors de la création du contact');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="flex justify-between items-center p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Nouveau Contact</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Nom Complet</label>
                        <input
                            type="text"
                            required
                            value={formData.nom}
                            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            placeholder="Ex: Jean Dupont"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            placeholder="jean@example.com"
                        />
                        <p className="text-xs text-slate-500 mt-1">Sera utilisé pour lier automatiquement un lead existant.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Téléphone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            placeholder="06 12 34 56 78"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex justify-center items-center gap-2"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            Créer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
