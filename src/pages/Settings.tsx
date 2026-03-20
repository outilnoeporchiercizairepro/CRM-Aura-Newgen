import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Loader as Loader2, Tag, Pencil, Check, X } from 'lucide-react';

type Tag = {
    id: string;
    name: string;
    color: string;
    created_at: string;
};

const PRESET_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6b7280',
];

export function Settings() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#3b82f6');
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');

    useEffect(() => {
        fetchTags();
    }, []);

    async function fetchTags() {
        setLoading(true);
        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .order('name');
        if (!error && data) setTags(data);
        setLoading(false);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!newTagName.trim()) return;
        setCreating(true);
        const { error } = await supabase.from('tags').insert([{
            name: newTagName.trim(),
            color: newTagColor
        }]);
        if (!error) {
            setNewTagName('');
            setNewTagColor('#3b82f6');
            fetchTags();
        } else {
            alert('Erreur: ce tag existe peut-être déjà.');
        }
        setCreating(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('Supprimer ce tag ? Il sera retiré de tous les contacts.')) return;
        await supabase.from('tags').delete().eq('id', id);
        setTags(prev => prev.filter(t => t.id !== id));
    }

    function startEdit(tag: Tag) {
        setEditingId(tag.id);
        setEditName(tag.name);
        setEditColor(tag.color);
    }

    async function saveEdit(id: string) {
        if (!editName.trim()) return;
        const { error } = await supabase.from('tags').update({ name: editName.trim(), color: editColor }).eq('id', id);
        if (!error) {
            setTags(prev => prev.map(t => t.id === id ? { ...t, name: editName.trim(), color: editColor } : t));
            setEditingId(null);
        } else {
            alert('Erreur lors de la mise à jour.');
        }
    }

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold text-white">Paramètres</h1>
                <p className="text-slate-400 mt-1">Gérez la configuration de votre CRM</p>
            </div>

            {/* Tags Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
                    <Tag size={20} className="text-blue-400" />
                    <div>
                        <h2 className="text-lg font-semibold text-white">Tags Contacts</h2>
                        <p className="text-xs text-slate-400">Créez des étiquettes pour catégoriser vos contacts</p>
                    </div>
                </div>

                {/* Create form */}
                <form onSubmit={handleCreate} className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
                    <div className="flex gap-2 flex-wrap">
                        {PRESET_COLORS.map(color => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setNewTagColor(color)}
                                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                                style={{
                                    backgroundColor: color,
                                    borderColor: newTagColor === color ? 'white' : 'transparent'
                                }}
                            />
                        ))}
                    </div>
                    <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Nom du tag..."
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 min-w-0"
                    />
                    <button
                        type="submit"
                        disabled={creating || !newTagName.trim()}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                    >
                        {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Créer
                    </button>
                </form>

                {/* Tags list */}
                <div className="divide-y divide-slate-700/50">
                    {loading ? (
                        <div className="px-6 py-8 flex justify-center">
                            <Loader2 size={24} className="animate-spin text-slate-500" />
                        </div>
                    ) : tags.length === 0 ? (
                        <div className="px-6 py-8 text-center text-slate-500 text-sm">
                            Aucun tag créé. Ajoutez votre premier tag ci-dessus.
                        </div>
                    ) : (
                        tags.map(tag => (
                            <div key={tag.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-700/30 transition-colors">
                                {editingId === tag.id ? (
                                    <>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {PRESET_COLORS.map(color => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setEditColor(color)}
                                                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                                                    style={{
                                                        backgroundColor: color,
                                                        borderColor: editColor === color ? 'white' : 'transparent'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                                            autoFocus
                                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(tag.id); if (e.key === 'Escape') setEditingId(null); }}
                                        />
                                        <button onClick={() => saveEdit(tag.id)} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors">
                                            <Check size={16} />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors">
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: tag.color }}
                                        />
                                        <span
                                            className="text-sm font-medium px-2.5 py-0.5 rounded-full"
                                            style={{ backgroundColor: tag.color + '20', color: tag.color }}
                                        >
                                            {tag.name}
                                        </span>
                                        <span className="flex-1" />
                                        <button
                                            onClick={() => startEdit(tag)}
                                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tag.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
