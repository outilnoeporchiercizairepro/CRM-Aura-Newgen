import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { Loader2, CheckCircle2, Circle, XCircle, ChevronRight, Calendar, FileText, Plus } from 'lucide-react';

type PipelineStatus = Database['public']['Enums']['pipeline_status_enum'];
type PipelineHistory = Database['public']['Tables']['pipeline_history']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

interface Props {
    contact: Contact | null;
    onUpdate: () => void;
    readOnly?: boolean;
}

const PIPELINE_STEPS: {
    status: PipelineStatus;
    label: string;
    description: string;
    branch?: 'main' | 'lost';
    needsDate?: 'r1' | 'r2';
}[] = [
    { status: 'prospect', label: 'Prospect', description: 'Contact identifié' },
    { status: 'r1_planifie', label: 'R1 Planifié', description: 'RDV 15min pris par le client', needsDate: 'r1' },
    { status: 'r1_realise', label: 'R1 Réalisé', description: 'RDV 15min effectué' },
    { status: 'qualifie', label: 'Qualifié', description: 'Client éligible au closing' },
    { status: 'r2_planifie', label: 'R2 Planifié', description: 'RDV closing planifié', needsDate: 'r2' },
    { status: 'r2_realise', label: 'R2 Réalisé', description: 'RDV closing effectué' },
    { status: 'close_gagne', label: 'Closé Gagné', description: 'Deal signé' },
];

const TERMINAL_STEPS: { status: PipelineStatus; label: string; description: string }[] = [
    { status: 'non_qualifie', label: 'Non Qualifié', description: 'Client non éligible après R1' },
    { status: 'close_perdu', label: 'Closé Perdu', description: 'Deal non signé' },
];

const STATUS_COLORS: Record<PipelineStatus, { bg: string; border: string; text: string; dot: string }> = {
    prospect: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-300', dot: 'bg-slate-500' },
    r1_planifie: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', dot: 'bg-blue-500' },
    r1_realise: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-300', dot: 'bg-cyan-500' },
    qualifie: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-500' },
    non_qualifie: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', dot: 'bg-amber-500' },
    r2_planifie: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', dot: 'bg-blue-500' },
    r2_realise: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-300', dot: 'bg-teal-500' },
    close_gagne: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-500' },
    close_perdu: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-300', dot: 'bg-rose-500' },
};

const MAIN_ORDER: PipelineStatus[] = [
    'prospect', 'r1_planifie', 'r1_realise', 'qualifie', 'r2_planifie', 'r2_realise', 'close_gagne'
];

function getStepIndex(status: PipelineStatus): number {
    return MAIN_ORDER.indexOf(status);
}

function isTerminal(status: PipelineStatus): boolean {
    return status === 'non_qualifie' || status === 'close_perdu';
}

function getStatusLabel(status: PipelineStatus): string {
    const all = [...PIPELINE_STEPS, ...TERMINAL_STEPS];
    return all.find(s => s.status === status)?.label ?? status;
}

export function PipelineTab({ contact, onUpdate, readOnly = false }: Props) {
    const [history, setHistory] = useState<PipelineHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<PipelineStatus | null>(null);
    const [noteText, setNoteText] = useState('');
    const [r1Date, setR1Date] = useState('');
    const [r2Date, setR2Date] = useState('');

    const currentStatus: PipelineStatus = contact?.pipeline_status ?? 'prospect';

    useEffect(() => {
        if (contact?.id) fetchHistory();
    }, [contact?.id]);

    async function fetchHistory() {
        if (!contact?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pipeline_history')
                .select('*')
                .eq('contact_id', contact.id)
                .order('changed_at', { ascending: false });
            if (error) throw error;
            setHistory(data ?? []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    function requestStatusChange(status: PipelineStatus) {
        if (readOnly || status === currentStatus) return;
        setPendingStatus(status);
        setNoteText('');
        setR1Date('');
        setR2Date('');
        setShowNoteModal(true);
    }

    async function confirmStatusChange() {
        if (!pendingStatus || !contact?.id) return;
        setSaving(true);
        try {
            const step = PIPELINE_STEPS.find(s => s.status === pendingStatus);
            const historyEntry: Database['public']['Tables']['pipeline_history']['Insert'] = {
                contact_id: contact.id,
                status: pendingStatus,
                notes: noteText || null,
                r1_date: step?.needsDate === 'r1' && r1Date ? r1Date : null,
                r2_date: step?.needsDate === 'r2' && r2Date ? r2Date : null,
            };

            const { error: histErr } = await supabase.from('pipeline_history').insert(historyEntry);
            if (histErr) throw histErr;

            const { error: contactErr } = await supabase
                .from('contacts')
                .update({ pipeline_status: pendingStatus })
                .eq('id', contact.id);
            if (contactErr) throw contactErr;

            setShowNoteModal(false);
            setPendingStatus(null);
            await fetchHistory();
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la mise à jour du statut pipeline');
        } finally {
            setSaving(false);
        }
    }

    async function updateHistoryNote(id: string, notes: string) {
        try {
            await supabase.from('pipeline_history').update({ notes }).eq('id', id);
            setHistory(prev => prev.map(h => h.id === id ? { ...h, notes } : h));
        } catch (err) {
            console.error(err);
        }
    }

    const currentIdx = getStepIndex(currentStatus);
    const isCurrentTerminal = isTerminal(currentStatus);
    const pendingStep = PIPELINE_STEPS.find(s => s.status === pendingStatus);

    if (!contact) {
        return (
            <div className="p-8 text-center text-slate-500 text-sm">
                Aucun contact associé à ce client.
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 overflow-y-auto">
            {/* Current status badge */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Statut actuel</p>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${STATUS_COLORS[currentStatus].bg} ${STATUS_COLORS[currentStatus].border} ${STATUS_COLORS[currentStatus].text}`}>
                        <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[currentStatus].dot}`} />
                        {getStatusLabel(currentStatus)}
                    </div>
                </div>
                {loading && <Loader2 size={16} className="animate-spin text-slate-600" />}
            </div>

            {/* Pipeline progress bar */}
            <div className="space-y-3">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Progression du Pipeline</p>
                <div className="relative">
                    {/* Track */}
                    <div className="flex items-center gap-0">
                        {PIPELINE_STEPS.map((step, idx) => {
                            const isDone = !isCurrentTerminal && currentIdx > idx;
                            const isActive = !isCurrentTerminal && currentIdx === idx;
                            const isFuture = isCurrentTerminal || currentIdx < idx;

                            return (
                                <div key={step.status} className="flex items-center flex-1 min-w-0">
                                    <button
                                        onClick={() => requestStatusChange(step.status)}
                                        disabled={readOnly}
                                        title={step.label}
                                        className={`relative flex flex-col items-center group flex-shrink-0 transition-all ${isFuture ? 'opacity-40 hover:opacity-70' : ''} ${readOnly ? 'cursor-default' : ''}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isDone
                                            ? 'bg-emerald-500 border-emerald-400 text-white'
                                            : isActive
                                                ? `${STATUS_COLORS[step.status].bg} ${STATUS_COLORS[step.status].border} ${STATUS_COLORS[step.status].text} ring-2 ring-offset-2 ring-offset-slate-900 ring-current`
                                                : 'bg-slate-800 border-slate-700 text-slate-600'
                                            }`}>
                                            {isDone
                                                ? <CheckCircle2 size={14} />
                                                : isActive
                                                    ? <Circle size={14} className="fill-current" />
                                                    : <Circle size={14} />
                                            }
                                        </div>
                                        <span className={`absolute -bottom-5 text-[9px] font-bold whitespace-nowrap ${isActive ? STATUS_COLORS[step.status].text : isDone ? 'text-emerald-400' : 'text-slate-600'}`}>
                                            {step.label}
                                        </span>
                                    </button>
                                    {idx < PIPELINE_STEPS.length - 1 && (
                                        <div className={`flex-1 h-0.5 mx-1 ${isDone ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Exit statuses */}
                <div className="mt-10 flex gap-3">
                    {TERMINAL_STEPS.map(step => (
                        <button
                            key={step.status}
                            onClick={() => requestStatusChange(step.status)}
                            disabled={readOnly}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${currentStatus === step.status
                                ? `${STATUS_COLORS[step.status].bg} ${STATUS_COLORS[step.status].border} ${STATUS_COLORS[step.status].text}`
                                : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                                } ${readOnly ? 'cursor-default' : ''}`}
                        >
                            <XCircle size={13} />
                            {step.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* History */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Historique des étapes</p>
                {loading ? (
                    <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-600" /></div>
                ) : history.length === 0 ? (
                    <div className="py-8 text-center bg-slate-800/20 border-2 border-dashed border-slate-800 rounded-xl">
                        <p className="text-slate-500 text-sm">Aucun mouvement enregistré</p>
                        <p className="text-slate-600 text-[11px] mt-1">Changez le statut pour démarrer le suivi</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {history.map(entry => (
                            <HistoryEntry
                                key={entry.id}
                                entry={entry}
                                onSaveNote={updateHistoryNote}
                                readOnly={readOnly}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Note / Date modal */}
            {showNoteModal && pendingStatus && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-150">
                        <div className="p-5 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[pendingStatus].dot}`} />
                                <h3 className="text-white font-bold text-sm">
                                    Passage à : <span className={STATUS_COLORS[pendingStatus].text}>{getStatusLabel(pendingStatus)}</span>
                                </h3>
                            </div>
                            <p className="text-slate-500 text-[11px] mt-1 pl-5">
                                {PIPELINE_STEPS.find(s => s.status === pendingStatus)?.description ?? TERMINAL_STEPS.find(s => s.status === pendingStatus)?.description}
                            </p>
                        </div>
                        <div className="p-5 space-y-4">
                            {pendingStep?.needsDate === 'r1' && (
                                <div>
                                    <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5">
                                        <Calendar size={10} className="inline mr-1" />
                                        Date du R1
                                    </label>
                                    <input
                                        type="date"
                                        value={r1Date}
                                        onChange={e => setR1Date(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}
                            {pendingStep?.needsDate === 'r2' && (
                                <div>
                                    <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5">
                                        <Calendar size={10} className="inline mr-1" />
                                        Date du R2
                                    </label>
                                    <input
                                        type="date"
                                        value={r2Date}
                                        onChange={e => setR2Date(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5">
                                    <FileText size={10} className="inline mr-1" />
                                    Notes (optionnel)
                                </label>
                                <textarea
                                    value={noteText}
                                    onChange={e => setNoteText(e.target.value)}
                                    placeholder={
                                        pendingStatus === 'non_qualifie' ? 'Raison de non-qualification...' :
                                            pendingStatus === 'close_perdu' ? 'Raison de la perte...' :
                                                'Ajouter une note...'
                                    }
                                    rows={3}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 resize-none placeholder:text-slate-600"
                                />
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-800 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowNoteModal(false); setPendingStatus(null); }}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmStatusChange}
                                disabled={saving}
                                className={`px-5 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2 transition-all shadow-lg ${STATUS_COLORS[pendingStatus].bg} ${STATUS_COLORS[pendingStatus].border} border hover:opacity-90`}
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function HistoryEntry({ entry, onSaveNote, readOnly = false }: { entry: PipelineHistory; onSaveNote: (id: string, notes: string) => void; readOnly?: boolean }) {
    const [editing, setEditing] = useState(false);
    const [note, setNote] = useState(entry.notes ?? '');
    const colors = STATUS_COLORS[entry.status];

    function handleBlur() {
        setEditing(false);
        if (note !== (entry.notes ?? '')) {
            onSaveNote(entry.id, note);
        }
    }

    return (
        <div className={`p-3 rounded-xl border ${colors.bg} ${colors.border}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${colors.dot}`} />
                    <span className={`text-xs font-bold ${colors.text}`}>{getStatusLabel(entry.status)}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {(entry.r1_date || entry.r2_date) && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            <Calendar size={9} />
                            {entry.r1_date
                                ? new Date(entry.r1_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                                : new Date(entry.r2_date!).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                            }
                        </span>
                    )}
                    <span className="text-[10px] text-slate-500">
                        {new Date(entry.changed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}
                        {new Date(entry.changed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            <div className="mt-2 ml-4">
                {!readOnly && editing ? (
                    <textarea
                        autoFocus
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        onBlur={handleBlur}
                        rows={2}
                        className="w-full bg-slate-900/60 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-blue-500 resize-none"
                    />
                ) : (
                    <button
                        onClick={() => !readOnly && setEditing(true)}
                        disabled={readOnly}
                        className={`flex items-center gap-1.5 text-[11px] text-slate-500 transition-colors group ${readOnly ? 'cursor-default' : 'hover:text-slate-300'}`}
                    >
                        {note
                            ? <span className="text-slate-400 italic">{note}</span>
                            : !readOnly
                                ? <>
                                    <Plus size={10} className="group-hover:text-blue-400" />
                                    <span className="group-hover:text-slate-300">Ajouter une note</span>
                                </>
                                : null
                        }
                    </button>
                )}
            </div>
        </div>
    );
}
