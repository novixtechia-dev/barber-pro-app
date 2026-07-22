# BARBER PRO — Documentação Completa

> Sistema SaaS de barbearia premium com agendamento online, PWA, notificações push e painel administrativo.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 + React + TypeScript |
| Estilo | Tailwind CSS + Framer Motion |
| Backend/DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth + JWT + RLS |
| Push | OneSignal |
| Deploy | Vercel + Supabase |

---

## Estrutura de Pastas

```
barber-pro/
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── (auth)/                  # Rotas públicas
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   ├── (client)/                # Rotas do cliente
│   │   │   ├── home/page.tsx        # Feed + Stories + Promoções
│   │   │   ├── booking/page.tsx     # Fluxo de agendamento
│   │   │   ├── bookings/page.tsx    # Histórico de agendamentos
│   │   │   └── profile/page.tsx
│   │   ├── (barber)/                # Rotas do barbeiro
│   │   │   ├── dashboard/page.tsx   # Agenda do dia + stats
│   │   │   ├── schedule/page.tsx    # Configurar horários
│   │   │   ├── services/page.tsx    # Gerenciar serviços
│   │   │   ├── portfolio/page.tsx   # Portfólio + galeria
│   │   │   ├── stories/page.tsx     # Criar stories
│   │   │   └── promotions/page.tsx  # Criar promoções
│   │   └── (admin)/                 # Rotas admin
│   │       ├── dashboard/page.tsx   # Métricas gerais
│   │       ├── barbers/page.tsx     # Gerenciar barbeiros
│   │       ├── clients/page.tsx     # Gerenciar clientes
│   │       └── reports/page.tsx     # Relatórios financeiros
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppLayout.tsx        ✅ Bottom nav, header
│   │   ├── booking/
│   │   │   └── BookingFlow.tsx      ✅ 6 passos completos
│   │   ├── stories/
│   │   │   └── StoriesList.tsx      ✅ Instagram-style, 24h
│   │   ├── admin/
│   │   │   └── AdminDashboard.tsx   ✅ Métricas + listagem
│   │   └── ui/                      # Componentes base (Button, Input, Modal...)
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx          ✅ Auth + profile + session
│   │
│   ├── services/
│   │   ├── booking.service.ts       ✅ CRUD + slots + notificações
│   │   └── notifications.ts         ✅ OneSignal helpers
│   │
│   ├── lib/
│   │   └── supabase.ts              ✅ Client + upload helper
│   │
│   ├── types/
│   │   └── index.ts                 ✅ Todos os tipos TS
│   │
│   └── hooks/                       # TODO: useBookings, useBarber, useSlots
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql   ✅ Schema completo + RLS + Triggers
│   └── functions/
│       └── send-reminders/
│           └── index.ts             ✅ Cron de lembretes + limpeza stories
│
├── public/
│   └── manifest.json                ✅ PWA manifest
│
├── .env.example                     ✅ Variáveis necessárias
├── next.config.js                   ✅ Headers de segurança
├── tailwind.config.js               ✅ Design tokens (preto/dourado)
└── package.json                     ✅ Todas as deps
```

---

## Setup Rápido

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar ambiente
```bash
cp .env.example .env.local
# Preencher SUPABASE_URL, SUPABASE_ANON_KEY, ONESIGNAL_APP_ID, etc.
```

### 3. Criar banco no Supabase
```bash
# No Dashboard do Supabase → SQL Editor → colar e executar:
supabase/migrations/001_initial_schema.sql
```

### 4. Criar buckets de storage no Supabase
```
avatars       → público
portfolio     → público
stories       → público
promotions    → público
```

### 5. Configurar OneSignal
- Criar app em onesignal.com
- Adicionar NEXT_PUBLIC_ONESIGNAL_APP_ID e ONESIGNAL_REST_API_KEY no .env.local
- Instalar o SDK no layout (ver abaixo)

### 6. Deploy da Edge Function (lembretes + limpeza stories)
```bash
supabase functions deploy send-reminders
# Agendar cron a cada 15min no Dashboard do Supabase
```

### 7. Rodar local
```bash
npm run dev
```

---

## O que ainda precisa ser criado no VSCode

### Prioridade ALTA (fluxo core)
- [ ] `src/app/layout.tsx` — root layout com AuthProvider + OneSignal init
- [ ] `src/app/(auth)/login/page.tsx` — tela de login
- [ ] `src/app/(auth)/register/page.tsx` — cadastro (cliente / barbeiro)
- [ ] `src/app/(client)/home/page.tsx` — feed com stories + promoções + barbeiros
- [ ] `src/app/(client)/booking/page.tsx` — wrap do BookingFlow
- [ ] `src/app/(client)/bookings/page.tsx` — lista de agendamentos do cliente
- [ ] `src/app/(barber)/dashboard/page.tsx` — agenda do dia do barbeiro
- [ ] `src/app/(admin)/dashboard/page.tsx` — wrap do AdminDashboard

### Prioridade MÉDIA
- [ ] `src/components/ui/Button.tsx` — botão reutilizável com variantes
- [ ] `src/components/ui/Input.tsx` — input estilizado
- [ ] `src/components/ui/Modal.tsx` — bottom sheet / modal
- [ ] `src/components/ui/Toast.tsx` — notificações (usar react-hot-toast)
- [ ] `src/components/barber/BarberCard.tsx` — card do barbeiro
- [ ] `src/components/barber/PortfolioGrid.tsx` — galeria com likes
- [ ] `src/app/(barber)/stories/page.tsx` — criar story (upload foto/vídeo)
- [ ] `src/app/(barber)/promotions/page.tsx` — criar promoção + enviar push
- [ ] `src/hooks/useBookings.ts` — hook de agendamentos com react-query
- [ ] `src/hooks/useBarber.ts` — hook de dados do barbeiro
- [ ] `src/middleware.ts` — proteger rotas por role

### Prioridade BAIXA
- [ ] PIX QR Code (integrar Mercado Pago ou EFI Bank)
- [ ] Geolocalização (mostrar unidades próximas com PostGIS)
- [ ] Service Worker (offline, cache)
- [ ] Tela de perfil do barbeiro pública
- [ ] Sistema de avaliações pós-atendimento
- [ ] Fila de espera UI

---

## Fluxo de Agendamento (já implementado)

```
BookingFlow.tsx
  Step 1 → Escolher unidade  (carrega do Supabase)
  Step 2 → Escolher barbeiro (filtra por unit_id)
  Step 3 → Escolher serviço  (filtra por unit_id ou global)
  Step 4 → Escolher data     (calendário 30 dias)
  Step 5 → Escolher horário  (getAvailableSlots → calcula bloqueios)
  Step 6 → Confirmar + Pagar (PIX / Cartão / Presencial)
          → createBooking() → notifica via OneSignal
```

## Banco de Dados (já implementado)

- **16 tabelas** com relacionamentos completos
- **RLS** em todas as tabelas sensíveis
- **3 triggers** automáticos (updated_at, rating, payment→booking)
- **Índices** nos campos mais consultados
- **10 serviços** padrão pré-cadastrados
- **Cron** de limpeza de stories (via Edge Function)

## Design System

```
Cores principais:
  #000000  Fundo principal
  #0a0a0b  Fundo cards (zinc-950)
  #18181b  Fundo elevado (zinc-900)
  #fbbf24  Dourado / Amber (primary CTA)
  #ffffff  Texto principal
  #9ca3af  Texto secundário (gray-400)

Raio: rounded-2xl (16px) padrão, rounded-3xl (24px) para cards grandes
Animações: Framer Motion, duração 200-300ms
Typography: Inter (body) + display scale
```
