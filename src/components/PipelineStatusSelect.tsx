import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { Loader2 } from 'lucide-react';

type PipelineStatus = Database['public']['Enums']['pipeline_status_enum'];

interface Props {
    currentStatus: PipelineStatus | null;
    contactId: string;
    onStatusChange: (newStatus: PipelineStatus) => void;
}

const PIPELINE_OPTIONS: { value: PipelineStatus; label: string }[] = [
    { value: 'prospect', label: 'Prospect' },
    { value: 'r1_planifie', label: 'R1 Planifié' },
    { value: 'r1_realise', label: 'R1 Réalisé' },
    { value: 'qualifie', label: 'Qualifié' },
    { value: 'non_qualifie', label: 'Non Qualifié' },
    { value: 'r2_planifie', label: 'R2 Planifié' },
    { value: 'r2_realise', label: 'R2 Réalisé' },
    { value: 'close_gagne', label: 'Closé Gagné' },
    { value: 'close_perdu', label: 'Closé Perdu' },
];

function getStatusColor(status: PipelineStatus | null): string {
    switch (status) {
        case 'prospect': return 'bg-slate-700 text-slate-300 border-slate-600';
        case 'r1_planifie': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        case 'r1_realise': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
        case 'qualifie': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
        case 'non_qualifie': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
        case 'r2_planifie': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        case 'r2_realise': return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
        case 'close_gagne': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
        case 'close_perdu': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
        default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
}

export function PipelineStatusSelect({ currentStatus, contactId, onStatusChange }: Props) {
    const [loading, setLoading] = useState(false);

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as PipelineStatus;
        if (newStatus === currentStatus) return;

        setLoading(true);
        try {
            const { error: histErr } = await supabase.from('pipeline_history').insert({
                contact_id: contactId,
                status: newStatus,
                notes: null,
                r1_date: null,
                r2_date: null,
            });
            if (histErr) throw histErr;

            const { error: contactErr } = await supabase
                .from('contacts')
                .update({ pipeline_status: newStatus })
                .eq('id', contactId);
            if (contactErr) throw contactErr;

            onStatusChange(newStatus);
        } catch (error) {
            console.error('Error updating pipeline status:', error);
            alert('Erreur lors de la mise à jour du statut pipeline');
        } finally {
            setLoading(false);
        }
    };

    const effective = currentStatus ?? 'prospect';

    return (
        <div className="relative inline-block">
            {loading && (
                <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
                    <Loader2 size={14} className="animate-spin text-slate-400" />
                </div>
            )}
            <select
                value={effective}
                onChange={handleChange}
                disabled={loading}
                className={`appearance-none pl-2 pr-7 py-1 rounded-md text-[10px] font-bold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${getStatusColor(effective)}`}
            >
                {PIPELINE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-800 text-slate-300">
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
