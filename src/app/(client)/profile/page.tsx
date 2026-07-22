'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CameraIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [profile, user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];
    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      // Atualiza context
      await refreshProfile();
      showToast('Foto atualizada!');
    } catch (error) {
      console.error(error);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      // 1. Atualizar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      await refreshProfile();

      // 2. Atualizar email (requer confirmação se a config do Supabase estiver ativa)
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw emailError;
        showToast('Verifique seu novo email para confirmar a troca.');
      }

      // 3. Atualizar senha
      if (newPassword.trim() !== '') {
        const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
        if (passwordError) throw passwordError;
        setNewPassword('');
        showToast('Senha atualizada com sucesso!');
      } else {
        showToast('Perfil salvo com sucesso!');
      }

    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Erro ao salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const avatarUrl = profile?.avatar_url || '';
  const initial = fullName ? fullName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white uppercase tracking-wider">Meu Perfil</h1>
        <p className="text-zinc-500 text-sm mt-1">Gerencie suas informações e foto de perfil</p>
      </div>

      {/* Gamification Progress */}
      {profile && (
        <div className="bg-gradient-to-r from-electric/10 to-primary/10 border border-electric/30 rounded-3xl p-6 mb-8 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-electric/20 text-electric rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h2 className="text-white font-bold text-lg mb-1">Seu Progresso</h2>
                <p className="text-electric text-sm font-bold">Nível {Math.floor((profile.cuts_count || 0) / 10) + 1} - {profile.tier?.toUpperCase() || 'STANDARD'}</p>
              </div>
              <div className="text-right">
                <span className="text-white font-black text-2xl">{(profile.cuts_count || 0) % 10}</span>
                <span className="text-zinc-400 text-sm font-medium">/10 cortes</span>
              </div>
            </div>
            
            <div className="w-full h-3 bg-dark/40 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(((profile.cuts_count || 0) % 10) / 10) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-electric to-primary rounded-full"
              />
            </div>
            
            <p className="text-zinc-400 text-xs mt-3 text-center">
              Complete 10 cortes para subir de nível e ganhar uma recompensa!
            </p>
          </div>
        </div>
      )}

      <div className="bg-dark border border-white/5 rounded-3xl p-6">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-electric/10 text-electric flex items-center justify-center text-electric text-3xl font-bold border-2 border-border">
              {uploadingAvatar ? (
                <ArrowPathIcon className="w-8 h-8 animate-spin text-electric" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 p-2 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all rounded-full shadow-lg hover:scale-110 transition-transform active:scale-95"
            >
              <CameraIcon className="w-4 h-4" />
            </button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleAvatarChange}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-3 font-medium uppercase tracking-widest">Alterar Foto</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1.5 block">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-electric focus:outline-none transition-colors"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1.5 block">
                Celular / WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-electric focus:outline-none transition-colors"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1.5 block">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-electric focus:outline-none transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          <div className="pt-4 border-t border-white/5">
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1.5 block">
              Nova Senha (opcional)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-electric focus:outline-none transition-colors"
              placeholder="Digite apenas se quiser alterar"
            />
          </div>

          <button
            type="submit"
            disabled={saving || uploadingAvatar}
            className="w-full mt-6 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <CheckIcon className="w-5 h-5" />
            )}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-surface border-border text-white px-6 py-3 rounded-full shadow-2xl border border-white/10 z-50 flex items-center gap-2"
          >
            <CheckIcon className="w-5 h-5 text-electric" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
