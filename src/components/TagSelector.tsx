import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Tag, X, ChevronDown, Plus } from 'lucide-react';

type Tag = {
    id: string;
    name: string;
    color: string;
};

interface Props {
    contactId: string;
    readOnly?: boolean;
}

export function TagSelector({ contactId, readOnly = false }: Props) {
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [contactTagIds, setContactTagIds] = useState<Set<string>>(new Set());
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchData();
    }, [contactId]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function fetchData() {
        setLoading(true);
        const [tagsRes, contactTagsRes] = await Promise.all([
            supabase.from('tags').select('*').order('name'),
            supabase.from('contact_tags').select('tag_id').eq('contact_id', contactId)
        ]);
        if (tagsRes.data) setAllTags(tagsRes.data);
        if (contactTagsRes.data) {
            setContactTagIds(new Set(contactTagsRes.data.map(ct => ct.tag_id)));
        }
        setLoading(false);
    }

    async function toggleTag(tagId: string) {
        if (readOnly) return;
        const isSelected = contactTagIds.has(tagId);
        if (isSelected) {
            await supabase.from('contact_tags').delete()
                .eq('contact_id', contactId)
                .eq('tag_id', tagId);
            setContactTagIds(prev => { const next = new Set(prev); next.delete(tagId); return next; });
        } else {
            await supabase.from('contact_tags').insert([{ contact_id: contactId, tag_id: tagId }]);
            setContactTagIds(prev => new Set([...prev, tagId]));
        }
    }

    const selectedTags = allTags.filter(t => contactTagIds.has(t.id));
    const unselectedTags = allTags.filter(t => !contactTagIds.has(t.id));

    if (loading) {
        return <div className="h-8 animate-pulse bg-slate-700 rounded-lg w-32" />;
    }

    return (
        <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-500 uppercase">Tags</label>

            {/* Selected tags */}
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                {selectedTags.map(tag => (
                    <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: tag.color + '25', color: tag.color, border: `1px solid ${tag.color}40` }}
                    >
                        {tag.name}
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={() => toggleTag(tag.id)}
                                className="hover:opacity-70 transition-opacity"
                            >
                                <X size={10} />
                            </button>
                        )}
                    </span>
                ))}
                {selectedTags.length === 0 && (
                    <span className="text-xs text-slate-600 italic">Aucun tag</span>
                )}
            </div>

            {/* Dropdown to add tags */}
            {!readOnly && allTags.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setOpen(!open)}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Plus size={12} />
                        Ajouter un tag
                        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>

                    {open && (
                        <div className="absolute z-30 top-full mt-1 left-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-52 overflow-hidden">
                            {unselectedTags.length === 0 ? (
                                <div className="px-3 py-3 text-xs text-slate-500 text-center">Tous les tags sont sélectionnés</div>
                            ) : (
                                unselectedTags.map(tag => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => toggleTag(tag.id)}
                                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-slate-800 transition-colors text-left"
                                    >
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                                        <span
                                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                                            style={{ backgroundColor: tag.color + '20', color: tag.color }}
                                        >
                                            {tag.name}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {!readOnly && allTags.length === 0 && (
                <p className="text-xs text-slate-600">
                    Créez des tags dans <span className="text-slate-400">Paramètres</span>
                </p>
            )}
        </div>
    );
}

export function ContactTagBadges({ contactId }: { contactId: string }) {
    const [tags, setTags] = useState<Tag[]>([]);

    useEffect(() => {
        supabase
            .from('contact_tags')
            .select('tags(id, name, color)')
            .eq('contact_id', contactId)
            .then(({ data }) => {
                if (data) {
                    setTags(data.map((ct: any) => ct.tags).filter(Boolean));
                }
            });
    }, [contactId]);

    if (tags.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1">
            {tags.map(tag => (
                <span
                    key={tag.id}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: tag.color + '20', color: tag.color, border: `1px solid ${tag.color}30` }}
                >
                    {tag.name}
                </span>
            ))}
        </div>
    );
}
