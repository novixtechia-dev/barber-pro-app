'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CheckIcon } from '@heroicons/react/24/solid';

function RegisterForm() {
  const { signUp } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (val: string) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`;
    setWhatsapp(v);
  };
  
  const [barbers, setBarbers] = useState<{id: string, name: string}[]>([]);
  const [selectedBarbers, setSelectedBarbers] = useState<string[]>([]);
  const [wantsPush, setWantsPush] = useState(true);

  const searchParams = useSearchParams();

  useEffect(() => {
    supabase.from('barbers').select('id, display_name').eq('is_active', true).then(({data}) => {
      if (data) {
        setBarbers(data.map(b => ({ id: b.id, name: b.display_name })));
        
        // Verifica se há um barbeiro de indicação na URL
        const refBarber = searchParams.get('barber');
        if (refBarber && data.some(b => b.id === refBarber)) {
          setSelectedBarbers([refBarber]);
        }
      }
    });
  }, [searchParams]);

  const toggleBarber = (id: string) => {
    setSelectedBarbers(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, name, { whatsapp, wantsPush, preferredBarbers: selectedBarbers });
      router.push('/home');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || JSON.stringify(err) || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-dark py-12">
      <div className="w-full max-w-md bg-dark p-8 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Criar Conta</h1>
          <p className="text-gray-400">Junte-se ao Barber Pro</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome Completo *" type="text" placeholder="João Silva" value={name} onChange={e => setName(e.target.value)} required />
          <Input label="WhatsApp *" type="tel" placeholder="(11) 99999-9999" value={whatsapp} onChange={e => handlePhoneChange(e.target.value)} required maxLength={15} />
          <Input label="E-mail *" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Senha *" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            <Input label="Confirmar Senha *" type="password" placeholder="Repita a senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
          </div>

          {barbers.length > 0 && (
            <div className="pt-4 border-t border-white/5 space-y-3">
              <label className="text-sm font-semibold text-white">Quais barbeiros você costuma cortar?</label>
              <p className="text-xs text-zinc-500 -mt-2">Você pode marcar quantos quiser, serve apenas para relacionamento.</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {barbers.map(b => {
                  const selected = selectedBarbers.includes(b.id);
                  return (
                    <button type="button" key={b.id} onClick={() => toggleBarber(b.id)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${selected ? 'bg-electric/10 text-electric text-electric border-electric/30' : 'bg-dark text-zinc-500 border-border'}`}>
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-dark/50 rounded-xl border border-white/5">
              <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors flex-shrink-0 ${wantsPush ? 'bg-electric' : 'bg-surface border-border'}`}>
                {wantsPush && <CheckIcon className="w-4 h-4 text-black" />}
              </div>
              <input type="checkbox" checked={wantsPush} onChange={e => setWantsPush(e.target.checked)} className="hidden" />
              <span className="text-sm text-zinc-300 font-medium">Desejo receber avisos de horários disponíveis.</span>
            </label>
          </div>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center mt-4">{error}</div>}

          <Button type="submit" isLoading={loading} className="mt-6 w-full">
            Cadastrar
          </Button>
        </form>

        <p className="text-center text-gray-500 mt-8 text-sm">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-electric font-semibold hover:underline">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark flex items-center justify-center"><div className="w-8 h-8 border-2 border-electric border-t-transparent rounded-full animate-spin"></div></div>}>
      <RegisterForm />
    </Suspense>
  );
}
