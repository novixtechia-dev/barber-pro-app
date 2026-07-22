'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirectTo') || '/home';
      router.push(redirectTo);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-dark">
      <div className="w-full max-w-md bg-dark p-8 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all rounded-2xl mx-auto flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo de volta</h1>
          <p className="text-gray-400">Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">{error}</div>}

          <Button type="submit" isLoading={loading} className="mt-2">
            Entrar
          </Button>
        </form>

        <p className="text-center text-gray-500 mt-8 text-sm">
          Ainda não tem conta?{' '}
          <Link href="/register" className="text-electric font-semibold hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
