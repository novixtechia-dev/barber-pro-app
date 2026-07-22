'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { BuildingStorefrontIcon, PhotoIcon, CheckIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

export default function ManageSettings() {
  const [unitId, setUnitId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    // Assumimos que a barbearia usa uma única unit principal, ou a primeira que encontrar
    const { data } = await supabase.from('units').select('id, name, logo_url').limit(1).single();
    if (data) {
      setUnitId(data.id);
      setName(data.name || '');
      setLogoUrl(data.logo_url || '');
    }
    setLoading(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars') // Utiliza o bucket avatars ou crie um bucket "assets" no Supabase
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao fazer upload da imagem. Certifique-se de ter o bucket "avatars" público criado.');
    } finally {
      setUploadingImage(false);
    }
  };

  const saveSettings = async () => {
    if (!unitId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('units')
        .update({ name, logo_url: logoUrl })
        .eq('id', unitId);

      if (error) throw error;
      showToast('Configurações salvas com sucesso! ✅');
    } catch (e: any) {
      console.error(e);
      alert('Erro ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-electric border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 pb-24 lg:pb-8 max-w-2xl mx-auto space-y-6">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl z-50">
          {toast}
        </div>
      )}

      <div className="bg-dark border border-white/5 p-6 rounded-3xl shadow-xl">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <BuildingStorefrontIcon className="w-6 h-6 text-electric" />
          Configurações da Barbearia
        </h2>

        <div className="space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-3">Logo da Barbearia</label>
            <div className="flex flex-col items-start gap-4">
              {logoUrl ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-electric bg-surface border-border">
                  <Image src={logoUrl} alt="Logo da Barbearia" fill className="object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-surface border-border border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-zinc-500">
                  <PhotoIcon className="w-8 h-8 mb-1" />
                  <span className="text-[10px] font-medium uppercase">Sem Logo</span>
                </div>
              )}
              
              <label className="cursor-pointer bg-surface border-border hover:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors relative overflow-hidden flex items-center gap-2">
                {uploadingImage ? 'Enviando...' : (
                  <>
                    <PhotoIcon className="w-4 h-4" /> Alterar Logo
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
              <p className="text-xs text-zinc-500">Esta logo será exibida nas notificações Push dos clientes.</p>
            </div>
          </div>

          <hr className="border-white/5" />

          {/* Nome da Barbearia */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Nome da Barbearia</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-dark border border-white/10 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:border-electric transition-colors"
              placeholder="Ex: Barber Pro"
            />
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-black p-4 rounded-xl hover:brightness-110 transition-colors active:scale-95 disabled:opacity-50 mt-6"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckIcon className="w-5 h-5" />
            )}
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}
