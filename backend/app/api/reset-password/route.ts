import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

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

// POST /api/reset-password - Verify token and update user password
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, token, newPassword } = body;

    // Validate inputs
    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: email, token, newPassword.' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'A nova senha deve conter no mínimo 8 caracteres.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Fetch user by email from Supabase Auth
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      return NextResponse.json(
        { error: 'Nenhum usuário encontrado com este e-mail.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Read token and expiry from user metadata
    const metadata = user.user_metadata || {};
    const resetToken = metadata.reset_token;
    const resetExpires = metadata.reset_token_expires;

    if (!resetToken || !resetExpires) {
      return NextResponse.json(
        { error: 'Nenhuma solicitação de redefinição ativa para este usuário.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Verify token match and expiry
    if (resetToken.toString() !== token.toString()) {
      return NextResponse.json(
        { error: 'O token inserido é inválido.' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (new Date(resetExpires) < new Date()) {
      return NextResponse.json(
        { error: 'O token expirou. Solicite um novo convite.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 4. Update the user password and clean reset token metadata
    const updatedMetadata = { ...metadata };
    delete updatedMetadata.reset_token;
    delete updatedMetadata.reset_token_expires;

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
        user_metadata: updatedMetadata
      }
    );

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Senha definida com sucesso. Você já pode fazer login.'
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('Error in POST /api/reset-password:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao redefinir senha.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
