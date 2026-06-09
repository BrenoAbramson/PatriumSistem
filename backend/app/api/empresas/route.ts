import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import nodemailer from 'nodemailer';

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

// GET /api/empresas - List companies, manager info, and user count
export async function GET() {
  try {
    // 1. Fetch companies (excluding the admin tenant CNPJ: 00000000000000)
    const { data: empresas, error: empError } = await supabaseAdmin
      .from('empresas')
      .select('*')
      .neq('cnpj', '00000000000000')
      .order('nome');

    if (empError) throw empError;

    if (!empresas || empresas.length === 0) {
      return NextResponse.json([], { headers: corsHeaders });
    }

    // 2. Fetch manager and user counts for each company in parallel
    const companiesWithDetails = await Promise.all(
      empresas.map(async (emp) => {
        // Fetch manager profile
        const { data: managerData } = await supabaseAdmin
          .from('usuarios')
          .select('nome, email')
          .eq('empresa_id', emp.id)
          .eq('perfil', 'Cliente-Gerente')
          .maybeSingle();

        // Fetch total active users count
        const { count } = await supabaseAdmin
          .from('usuarios')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', emp.id);

        return {
          id: emp.id,
          nome: emp.nome,
          cnpj: emp.cnpj,
          gerente_nome: managerData?.nome || 'Não designado',
          gerente_email: managerData?.email || 'Não designado',
          qtd_usuarios: count || 0,
          created_at: emp.created_at
        };
      })
    );

    return NextResponse.json(companiesWithDetails, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in GET /api/empresas:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno do servidor.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/empresas - Create company, manager user and send invitation email
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome_empresa, cnpj, endereco, nome_gerente, email_gerente } = body;

    // Validate request
    if (!nome_empresa || !cnpj || !nome_gerente || !email_gerente) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: nome_empresa, cnpj, nome_gerente, email_gerente.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if CNPJ already exists in database
    const { data: existingCompany } = await supabaseAdmin
      .from('empresas')
      .select('id')
      .eq('cnpj', cnpj)
      .maybeSingle();

    if (existingCompany) {
      return NextResponse.json(
        { error: 'Já existe uma empresa cadastrada com este CNPJ.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if manager email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', email_gerente)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Já existe um usuário cadastrado com este e-mail.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Generate 6-digit random token and expiry (24 hours)
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 2. Create the Empresa
    const { data: empresa, error: empError } = await supabaseAdmin
      .from('empresas')
      .insert({ nome: nome_empresa, cnpj: cnpj })
      .select()
      .single();

    if (empError) throw empError;

    let authUser = null;
    try {
      // 3. Create Manager Auth User
      const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email_gerente,
        password: Math.random().toString(36).slice(-12), // Temporary random password
        email_confirm: true,
        user_metadata: {
          nome: nome_gerente,
          endereco: endereco || '',
          reset_token: token,
          reset_token_expires: tokenExpires,
          empresa_id: empresa.id
        }
      });

      if (authError) throw authError;
      authUser = newAuthUser.user;

      // 4. Create Manager profile in usuarios table
      const { error: profileError } = await supabaseAdmin
        .from('usuarios')
        .insert({
          id: authUser.id,
          empresa_id: empresa.id,
          nome: nome_gerente,
          email: email_gerente,
          perfil: 'Cliente-Gerente'
        });

      if (profileError) throw profileError;

      // 5. Send Invitation Email using Nodemailer (Ethereal test account)
      let testAccount = await nodemailer.createTestAccount();
      let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const resetLink = `http://localhost:5173/definir-senha?email=${encodeURIComponent(email_gerente)}`;
      const mailInfo = await transporter.sendMail({
        from: '"Patrium Gestão Patrimonial" <noreply@patrium.com>',
        to: email_gerente,
        subject: "Bem-vindo ao Patrium - Sua conta foi criada!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 12px; color: #0F172A;">
            <h2 style="color: #3B82F6; margin-top: 0;">Olá, ${nome_gerente}!</h2>
            <p>Sua empresa, <strong>${nome_empresa}</strong>, foi cadastrada com sucesso no <strong>Patrium</strong> (Sistema de Gestão Patrimonial).</p>
            <p>Um perfil de <strong>Gerente</strong> foi criado para você. Para começar a gerenciar seus ativos, utilize os dados de acesso abaixo para redefinir sua senha:</p>
            
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <span style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748B; display: block; margin-bottom: 8px;">Seu Token de Confirmação</span>
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0F172A; font-family: monospace;">${token}</span>
            </div>
            
            <p style="margin-bottom: 24px;">Clique no botão abaixo para definir sua senha de acesso e ativar sua conta:</p>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${resetLink}" style="background-color: #3B82F6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);">
                Definir Minha Senha
              </a>
            </div>
            
            <p style="font-size: 12px; color: #64748B; text-align: center; margin-top: 24px; border-top: 1px solid #E2E8F0; padding-top: 16px;">
              Este link e token expiram em 24 horas. Se você não solicitou este cadastro, por favor ignore este e-mail.
            </p>
          </div>
        `
      });

      const emailPreviewUrl = nodemailer.getTestMessageUrl(mailInfo);
      
      console.log("\n==================================================================");
      console.log("INVITATION EMAIL SENT SUCCESSFULLY!");
      console.log("Recipient:", email_gerente);
      console.log("Token:", token);
      console.log("Preview URL:", emailPreviewUrl);
      console.log("==================================================================\n");

      return NextResponse.json({
        success: true,
        message: 'Empresa e gerente cadastrados com sucesso.',
        empresa_id: empresa.id,
        email_preview: emailPreviewUrl
      }, { headers: corsHeaders });

    } catch (createErr: any) {
      // Rollback: try to clean up if partial failure
      console.error('Failure during manager creation, initiating rollback:', createErr);
      if (authUser?.id) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      }
      await supabaseAdmin.from('empresas').delete().eq('id', empresa.id);
      throw createErr;
    }

  } catch (err: any) {
    console.error('Error in POST /api/empresas:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao cadastrar empresa.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
