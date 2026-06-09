import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import nodemailer from 'nodemailer';
import { logAuditoria } from '../../../lib/audit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

const isUuid = (val: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};

// GET /api/usuarios - List users with company names, status and optional company filter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    let query = supabaseAdmin
      .from('usuarios')
      .select('*, empresas(id, nome)')
      .order('created_at', { ascending: false });

    if (isUuid(empresaId)) {
      query = query.eq('empresa_id', empresaId);
    }

    const { data: users, error: usersError } = await query;
    if (usersError) throw usersError;

    // Fetch auth users from Supabase to check banned (inactive) status
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    // Merge public records with auth status
    const usersWithStatus = (users || []).map(user => {
      const authUser = authUsers.find(au => au.id === user.id);
      // Banned until in the future means user is inactive
      const isBanned = !!(authUser && authUser.banned_until && new Date(authUser.banned_until) > new Date());
      return {
        ...user,
        ativo: !isBanned
      };
    });

    return NextResponse.json(usersWithStatus, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in GET /api/usuarios:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao buscar usuários.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/usuarios - Create user, configure auth and profile, and send verification email
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, email, perfil, empresa_id, operatorId } = body;

    // Validation
    if (!nome || !email || !perfil) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: nome, email e perfil.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // If profile is Client-based, check if company is defined
    if ((perfil === 'Cliente-Gerente' || perfil === 'Cliente-Colaborador') && !empresa_id) {
      return NextResponse.json(
        { error: 'Para perfis de clientes, a Empresa deve ser informada.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if email already exists in usuarios table
    const { data: existingUser } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Já existe um usuário cadastrado com este e-mail.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch company name if company_id is provided
    let companyName = 'Patrium Gestão Patrimonial';
    if (empresa_id) {
      const { data: company } = await supabaseAdmin
        .from('empresas')
        .select('nome')
        .eq('id', empresa_id)
        .maybeSingle();
      if (company) {
        companyName = company.nome;
      }
    }

    // Generate activation token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    let authUser = null;
    try {
      // Create user auth account
      const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: Math.random().toString(36).slice(-12), // temp password
        email_confirm: true,
        user_metadata: {
          nome: nome,
          reset_token: token,
          reset_token_expires: tokenExpires,
          empresa_id: empresa_id || null
        }
      });

      if (authError) throw authError;
      authUser = newAuthUser.user;

      // Create public profile record
      const { error: profileError } = await supabaseAdmin
        .from('usuarios')
        .insert({
          id: authUser.id,
          empresa_id: empresa_id || null,
          nome: nome,
          email: email,
          perfil: perfil
        });

      if (profileError) throw profileError;

      // Send invite email using Nodemailer (Ethereal test mail account)
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const resetLink = `http://localhost:5173/definir-senha?email=${encodeURIComponent(email)}`;
      const mailInfo = await transporter.sendMail({
        from: '"Patrium Gestão Patrimonial" <noreply@patrium.com>',
        to: email,
        subject: "Sua conta no Patrium foi criada!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 12px; color: #0F172A;">
            <h2 style="color: #3B82F6; margin-top: 0;">Olá, ${nome}!</h2>
            <p>Sua conta de acesso ao **Patrium** foi criada com sucesso pelo Administrador do sistema.</p>
            <p><strong>Empresa associada:</strong> ${companyName}</p>
            <p><strong>Nível de Acesso/Perfil:</strong> ${perfil === 'Administrador' ? 'Desenvolvedor / Administrador' : perfil === 'Cliente-Gerente' ? 'Gerente de Patrimônio' : 'Colaborador'}</p>
            <p>Para ativar sua conta e configurar sua senha, utilize o token abaixo na página de ativação:</p>
            
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <span style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748B; display: block; margin-bottom: 8px;">Token de Ativação</span>
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0F172A; font-family: monospace;">${token}</span>
            </div>
            
            <p style="margin-bottom: 24px;">Clique no botão abaixo para definir sua senha de acesso e ativar sua conta:</p>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${resetLink}" style="background-color: #3B82F6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);">
                Definir Minha Senha e Acessar
              </a>
            </div>
            
            <p style="font-size: 12px; color: #64748B; text-align: center; margin-top: 24px; border-top: 1px solid #E2E8F0; padding-top: 16px;">
              Este link e token expiram em 24 horas. Se você não esperava esta conta, entre em contato com a equipe do Patrium.
            </p>
          </div>
        `
      });

      const emailPreviewUrl = nodemailer.getTestMessageUrl(mailInfo);

      console.log("\n==================================================================");
      console.log("USER INVITATION EMAIL SENT SUCCESSFULLY!");
      console.log("Recipient:", email);
      console.log("Token:", token);
      console.log("Preview URL:", emailPreviewUrl);
      console.log("==================================================================\n");

      await logAuditoria({
        empresa_id: empresa_id || null,
        entidade_id: authUser.id,
        entidade_tipo: 'usuarios',
        acao: 'CRIACAO',
        alterado_por: operatorId || null,
        dados_novos: { id: authUser.id, nome, email, perfil }
      });

      return NextResponse.json({
        success: true,
        message: 'Usuário cadastrado com sucesso.',
        user_id: authUser.id,
        email_preview: emailPreviewUrl
      }, { headers: corsHeaders });

    } catch (createErr: any) {
      console.error('Error during user profile creation, rolling back:', createErr);
      if (authUser?.id) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      }
      throw createErr;
    }
  } catch (err: any) {
    console.error('Error in POST /api/usuarios:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao cadastrar usuário.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PATCH /api/usuarios - Update user status (active/inactive) using ban duration
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, ativo } = body;

    if (!userId || ativo === undefined) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: userId e ativo.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // ban_duration 'none' means active, '876000h' (100 years) means banned/inactive
    const banDuration = ativo ? 'none' : '876000h';
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { ban_duration: banDuration }
    );

    if (banError) throw banError;

    // Fetch user profile for logging
    const { data: userProfile } = await supabaseAdmin
      .from('usuarios')
      .select('empresa_id, nome')
      .eq('id', userId)
      .single();

    const { operatorId } = body;
    await logAuditoria({
      empresa_id: userProfile?.empresa_id || null,
      entidade_id: userId,
      entidade_tipo: 'usuarios',
      acao: 'ALTERACAO',
      alterado_por: operatorId || null,
      dados_novos: { nome: userProfile?.nome, ativo }
    });

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in PATCH /api/usuarios:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao atualizar status do usuário.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE /api/usuarios - Excluir um usuário
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const operatorId = searchParams.get('operatorId');

    if (!userId || !isUuid(userId)) {
      return NextResponse.json(
        { error: 'ID de usuário inválido ou ausente.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch user profile first for audit logging
    const { data: oldUser, error: fetchError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Delete auth account
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) throw authDeleteError;

    // Delete public profile
    const { error: profileDeleteError } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) throw profileDeleteError;

    // Log the audit event
    await logAuditoria({
      empresa_id: oldUser.empresa_id,
      entidade_id: userId,
      entidade_tipo: 'usuarios',
      acao: 'EXCLUSAO',
      alterado_por: operatorId || null,
      dados_anteriores: oldUser
    });

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in DELETE /api/usuarios:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao excluir usuário.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
