import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();
  const path = req.nextUrl.pathname;

  // ─── Rotas públicas ───────────────────────────────────────────
  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/api');
  if (isPublic) return res;

  // ─── Sem sessão → login ───────────────────────────────────────
  if (!session) {
    const loginUrl = new URL('/login', req.url);
    if (path !== '/' && path !== '/home') {
      loginUrl.searchParams.set('redirectTo', req.nextUrl.pathname + req.nextUrl.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  // ─── Buscar role do usuário ────────────────────────────────────
  // Para evitar timeouts (504) no Vercel Edge, fazemos cache do role em um cookie.
  // Next.js faz prefetch de links, o que causaria dezenas de queries simultâneas e timeouts.
  let role = req.cookies.get('user-role')?.value;

  if (!role) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    role = profile?.role ?? 'client';
    
    // Salva o role no cookie da resposta para as próximas requisições
    res.cookies.set('user-role', role, { 
      path: '/',
      maxAge: 60 * 60 * 24, // 24 horas
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
  }

  // ─── Proteção contra Banimento ──────────────────────────────────
  if (role === 'banned') {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'banned');
    
    // Força a remoção do cookie em caso de banimento
    res.cookies.delete('user-role');
    
    return NextResponse.redirect(loginUrl);
  }

  // ─── Rota raiz → redireciona para home ────────────────────────
  if (path === '/') {
    return NextResponse.redirect(new URL('/home', req.url));
  }

  // ─── Redireciona login/register para a home ───────────────────
  if (path === '/login' || path === '/register') {
    return NextResponse.redirect(new URL('/home', req.url));
  }

  // ─── Proteção do painel Admin ─────────────────────────────────
  if (path.startsWith('/admin')) {
    if (role !== 'admin') {
      // Redireciona para o painel correto de acordo com o role
      if (role === 'barber') return NextResponse.redirect(new URL('/barber/dashboard', req.url));
      return NextResponse.redirect(new URL('/home', req.url));
    }
  }

  // ─── Proteção do painel Barbeiro ──────────────────────────────
  const isBarberDashboard = path.startsWith('/barber/dashboard') || path.startsWith('/barber/schedule');
  if (isBarberDashboard) {
    if (role !== 'barber' && role !== 'admin') {
      // Clientes não podem entrar no painel de gestão do barbeiro
      return NextResponse.redirect(new URL('/home', req.url));
    }
  }

  // ─── App route access ───
  // Barbeiros também podem acessar as rotas do app se quiserem
  // (nenhum bloqueio aqui para /home e /booking)

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|screenshots|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
