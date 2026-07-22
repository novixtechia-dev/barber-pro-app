'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { TrashIcon, PlusIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';
import { CheckIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  views_count: number;
  created_at: string;
  expires_at: string;
}

export default function ManageStories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState('');
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    setStories(data || []);
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const save = async () => {
    if (!file) return showToast('Selecione uma imagem ou vídeo!');
    setSaving(true);

    try {
      const { data: barbers } = await supabase.from('barbers').select('id').limit(1).maybeSingle();
      if (!barbers) throw new Error('Perfil de barbeiro não encontrado');

      // Upload do arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `stories/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

      // Define datas (Agendamento vs Agora)
      let createdAt = new Date();
      if (scheduledFor) {
        createdAt = new Date(scheduledFor);
      }
      
      const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); // +24 horas

      await supabase.from('stories').insert({
        barber_id: barbers.id,
        media_url: publicUrl,
        media_type: mediaType,
        caption: caption,
        created_at: createdAt.toISOString(),
        expires_at: expiresAt.toISOString()
      });

      setIsOpen(false);
      resetForm();
      showToast('Story publicado/agendado com sucesso!');
      load();
    } catch (error: any) {
      console.error(error);
      showToast('Erro ao publicar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, mediaUrl: string) => {
    if (confirm('Tem certeza que deseja excluir este story?')) {
      // Deletar do banco
      await supabase.from('stories').delete().eq('id', id);
      setStories(p => p.filter(s => s.id !== id));
      
      // Deletar do storage se for um arquivo local
      if (mediaUrl.includes('/storage/v1/object/public/uploads/')) {
        const path = mediaUrl.split('/uploads/')[1];
        if (path) {
          await supabase.storage.from('uploads').remove([path]);
        }
      }
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreviewUrl('');
    setCaption('');
    setScheduledFor('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getStatusLabel = (story: Story) => {
    const now = new Date().getTime();
    const created = new Date(story.created_at).getTime();
    const expires = new Date(story.expires_at).getTime();

    if (created > now) {
      const diff = created - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      return <span className="text-blue-400 font-medium">Agendado (em {h}h {m}m)</span>;
    }
    
    const diff = expires - now;
    const h = Math.floor(diff / 3600000);
    return <span className="text-electric font-medium">Expira em {h < 1 ? '<1h' : `${h}h`}</span>;
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div className="p-4 pb-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Stories</h2>
          <p className="text-zinc-500 text-sm">Gerencie suas publicações • {stories.length} itens</p>
        </div>
        <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all text-sm font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform">
          <PlusIcon className="w-4 h-4" /> Novo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center pt-10"><div className="w-7 h-7 border-2 border-electric border-t-transparent rounded-full animate-spin" /></div>
      ) : stories.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center mx-auto mb-4">
            <PlusIcon className="w-7 h-7 text-zinc-600" />
          </div>
          <p className="text-zinc-600 text-sm">Nenhum story ativo ou agendado</p>
          <p className="text-zinc-700 text-xs mt-1">Publique uma foto ou vídeo para aparecer na home</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {stories.map(s => (
            <motion.div key={s.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className={`relative rounded-2xl overflow-hidden aspect-[9/16] bg-dark group ${new Date(s.created_at) > new Date() ? 'opacity-70 grayscale-[0.3]' : ''}`}>
              
              {s.media_type === 'video' ? (
                <video src={s.media_url} className="absolute inset-0 w-full h-full object-cover" muted />
              ) : (
                <img src={s.media_url} alt={s.caption || 'Story'} className="absolute inset-0 w-full h-full object-cover" />
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />
              
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-dark/50 backdrop-blur rounded-full px-2 py-1">
                <EyeIcon className="w-3 h-3 text-white" />
                <span className="text-white text-[10px]">{s.views_count}</span>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-[10px]">{getStatusLabel(s)}</p>
                {s.caption && <p className="text-white text-xs mt-0.5 line-clamp-2">{s.caption}</p>}
              </div>

              <button onClick={() => remove(s.id, s.media_url)}
                className="absolute top-2 right-2 p-2 bg-red-500/90 backdrop-blur rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <TrashIcon className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-dark/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              className="bg-dark w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-border overflow-hidden max-h-[90vh] flex flex-col">
              
              <div className="flex items-center justify-between p-5 border-b border-border/50 shrink-0">
                <h3 className="font-bold text-white">Novo Story</h3>
                <button onClick={() => { setIsOpen(false); resetForm(); }} className="p-1.5 hover:bg-surface border-border rounded-lg">
                  <XMarkIcon className="w-6 h-6 text-zinc-400" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-5">
                {/* Upload Section */}
                <div>
                  <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 block">Mídia (Foto ou Vídeo)</label>
                  {!previewUrl ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-[9/16] max-h-[300px] border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-dark/50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-surface border-border flex items-center justify-center">
                        <PlusIcon className="w-6 h-6 text-zinc-400" />
                      </div>
                      <p className="text-zinc-500 text-sm font-medium">Toque para escolher</p>
                    </div>
                  ) : (
                    <div className="relative aspect-[9/16] max-h-[300px] rounded-2xl overflow-hidden bg-dark mx-auto w-fit">
                      {file?.type.startsWith('video/') ? (
                        <video src={previewUrl} className="h-full object-contain" autoPlay muted loop playsInline />
                      ) : (
                        <img src={previewUrl} alt="Preview" className="h-full object-contain" />
                      )}
                      <button 
                        onClick={() => { setFile(null); setPreviewUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="absolute top-2 right-2 p-2 bg-dark/60 backdrop-blur rounded-full text-white hover:bg-dark/80 transition-colors"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*,video/*"
                    className="hidden" 
                  />
                </div>

                {/* Agendamento */}
                <div>
                  <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 block">Agendar (Opcional)</label>
                  <input 
                    type="datetime-local" 
                    value={scheduledFor} 
                    onChange={e => setScheduledFor(e.target.value)}
                    className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-electric/50 transition-colors" 
                  />
                  <p className="text-zinc-600 text-[11px] mt-1.5">Se deixar em branco, será publicado agora. O story dura 24h a partir do momento agendado.</p>
                </div>

                {/* Legenda */}
                <div>
                  <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 block">Legenda (Opcional)</label>
                  <input 
                    placeholder="Degradê do dia 🔥" 
                    value={caption} 
                    onChange={e => setCaption(e.target.value)}
                    className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-electric/50 transition-colors" 
                  />
                </div>
              </div>

              <div className="p-5 border-t border-border/50 shrink-0">
                <button onClick={save} disabled={saving || !file} className="w-full py-3.5 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {saving ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CheckIcon className="w-5 h-5" />}
                  {saving ? 'Processando...' : scheduledFor ? 'Agendar Story' : 'Publicar Agora'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-surface border-border text-white text-sm px-5 py-3 rounded-full border border-white/10 shadow-xl z-[60] whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
