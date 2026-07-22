'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PaperAirplaneIcon, PhotoIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export default function ManageNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return toast.error('Título e mensagem são obrigatórios');

    setIsLoading(true);
    try {
      const res = await fetch('/api/notify-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, imageUrl }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
      
      toast.success('Notificação enviada para todos os clientes!');
      setTitle('');
      setMessage('');
      setImageUrl('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar notificação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Disparar Notificações</h2>
      </div>

      <div className="bg-dark border border-white/5 p-6 rounded-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-electric/10 text-electric rounded-xl flex items-center justify-center">
            <PaperAirplaneIcon className="w-5 h-5 text-electric" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Notificação Push Global</h3>
            <p className="text-sm text-zinc-400">Envie avisos, promoções ou alertas para todos os clientes.</p>
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Título da Notificação</label>
            <input
              type="text"
              required
              placeholder="Ex: Promoção Relâmpago! ⚡"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-dark border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-electric/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Mensagem (Corpo)</label>
            <textarea
              required
              rows={3}
              placeholder="Ex: Corte + Barba com 20% de desconto hoje até as 18h. Agende já!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-dark border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-electric/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">URL da Imagem (Opcional)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <PhotoIcon className="w-5 h-5 text-zinc-500" />
              </div>
              <input
                type="url"
                placeholder="https://exemplo.com/imagem.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-dark border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-electric/50"
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">Recomendado formato 16:9 (ex: 1024x512px) para a notificação no celular.</p>
          </div>

          {/* Preview */}
          <div className="pt-4">
            <h4 className="text-sm font-medium text-zinc-400 mb-3">Pré-visualização (Android/iOS)</h4>
            <div className="bg-dark border border-white/10 rounded-2xl p-4 max-w-sm relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 bg-electric rounded flex items-center justify-center">
                  <span className="text-black font-bold text-[10px]">BP</span>
                </div>
                <span className="text-xs text-zinc-400 font-medium">Barber Pro • Agora</span>
              </div>
              <h5 className="text-white font-bold text-sm leading-tight mb-1">{title || 'Título da Notificação'}</h5>
              <p className="text-zinc-300 text-xs line-clamp-2 leading-relaxed">{message || 'Sua mensagem aparecerá aqui...'}</p>
              
              {imageUrl && (
                <div className="mt-3 aspect-video rounded-lg overflow-hidden bg-surface border-border">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-bold py-4 rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {isLoading ? 'Enviando...' : (
              <>
                <PaperAirplaneIcon className="w-5 h-5" />
                Disparar para todos
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
