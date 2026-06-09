import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// CORS Headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight options request
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// POST /api/profile - Update user profile and optionally company details
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, nome, newPassword, currentPassword, nome_empresa, cnpj } = body;

    // Validate essential inputs
    if (!userId || !nome) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: userId e nome.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Fetch current profile from database
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('usuarios')
      .select('perfil, empresa_id')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json(
        { error: 'Perfil de usuário não encontrado.' },
        { status: 404, headers: corsHeaders }
      );
    }

    // 2. Update user name in usuarios table
    const { error: profileError } = await supabaseAdmin
      .from('usuarios')
      .update({ nome })
      .eq('id', userId);

    if (profileError) throw profileError;

    // 3. Update password in Supabase Auth if provided (validating current password first)
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Para alterar a senha, é necessário informar a senha atual.' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: 'A nova senha deve ter pelo menos 8 caracteres.' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Fetch user auth record to retrieve their email address
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUserError || !authUser?.user) {
        return NextResponse.json(
          { error: 'Usuário não localizado no sistema de autenticação.' },
          { status: 404, headers: corsHeaders }
        );
      }

      // Validate current password by attempting a signIn
      const tempClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { error: signInError } = await tempClient.auth.signInWithPassword({
        email: authUser.user.email!,
        password: currentPassword
      });

      if (signInError) {
        return NextResponse.json(
          { error: 'A senha atual informada está incorreta.' },
          { status: 401, headers: corsHeaders }
        );
      }

      // If correct, perform the password update
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { 
          password: newPassword,
          user_metadata: { nome }
        }
      );

      if (authError) throw authError;
    } else {
      // Just update name in metadata if password is not changed
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { 
          user_metadata: { nome }
        }
      );
      if (authError) throw authError;
    }

    // 4. Update company details if user is Cliente-Gerente and fields are provided
    if (profile.perfil === 'Cliente-Gerente' && profile.empresa_id) {
      if (nome_empresa || cnpj) {
        // Validate inputs
        if (!nome_empresa || !cnpj) {
          return NextResponse.json(
            { error: 'Para gerentes, o Nome da Empresa e o CNPJ são obrigatórios.' },
            { status: 400, headers: corsHeaders }
          );
        }

        // Clean CNPJ format
        const cleanCnpj = cnpj.replace(/[^\d]/g, '');
        if (cleanCnpj.length !== 14) {
          return NextResponse.json(
            { error: 'CNPJ inválido.' },
            { status: 400, headers: corsHeaders }
          );
        }

        // Update company
        const { error: empError } = await supabaseAdmin
          .from('empresas')
          .update({
            nome: nome_empresa,
            cnpj: cleanCnpj
          })
          .eq('id', profile.empresa_id);

        if (empError) throw empError;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Dados atualizados com sucesso.'
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('Error in POST /api/profile:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao atualizar dados do perfil.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
