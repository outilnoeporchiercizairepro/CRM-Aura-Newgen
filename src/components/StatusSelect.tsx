import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { Loader2 } from 'lucide-react';

type ContactStatus = Database['public']['Enums']['contact_status_enum'];

interface Props {
    currentStatus: ContactStatus | null;
    contactId: string;
    onStatusChange: (newStatus: ContactStatus) => void;
}

const STATUS_OPTIONS: ContactStatus[] = [
    'Call planifié',
    'A recontacter',
    'Closé',
    'Attente paiement',
    'Attente retour',
    'Pas venu',
    'Pas budget'
];

export function StatusSelect({ currentStatus, contactId, onStatusChange }: Props) {
    const [loading, setLoading] = useState(false);

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'Closé': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'Call planifié': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'Pas budget': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'A recontacter': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as ContactStatus;
        if (newStatus === currentStatus) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('contacts')
                .update({ status: newStatus })
                .eq('id', contactId);

            if (error) throw error;
            onStatusChange(newStatus);
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Erreur lors de la mise à jour du statut');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative inline-block">
            {loading && (
                <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
                    <Loader2 size={14} className="animate-spin text-slate-400" />
                </div>
            )}
            <select
                value={currentStatus || ''}
                onChange={handleChange}
                disabled={loading}
                className={`appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-medium border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${getStatusColor(currentStatus)}`}
            >
                {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status} className="bg-slate-800 text-slate-300">
                        {status}
                    </option>
                ))}
            </select>
        </div>
    );
}
