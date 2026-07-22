import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    const { userId, adminId } = await req.json();

    if (!userId || !adminId) {
      return NextResponse.json({ error: 'Faltando userId ou adminId' }, { status: 400 });
    }

    // Verificar se o requestor é admin ou barbeiro
    const { data: requestorProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .single();

    if (!requestorProfile || (requestorProfile.role !== 'admin' && requestorProfile.role !== 'barber')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Deletar o usuário completamente no auth.users (isso vai acionar ON DELETE CASCADE para a tabela profiles)
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Usuário deletado' });
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
