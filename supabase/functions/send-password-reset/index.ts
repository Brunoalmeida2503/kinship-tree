import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  email: string;
  redirectUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectUrl }: ResetPasswordRequest = await req.json();

    console.log(`[RESET PASSWORD] Solicitação de reset para: ${email}`);

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Criar cliente Supabase admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Gerar link de recuperação de senha
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkError) {
      console.error("[RESET PASSWORD] Erro ao gerar link:", linkError);
      return new Response(
        JSON.stringify({ error: linkError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const recoveryLink = data.properties?.action_link;

    if (!recoveryLink) {
      console.error("[RESET PASSWORD] Link de recuperação não gerado");
      return new Response(
        JSON.stringify({ error: "Não foi possível gerar o link de recuperação" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[RESET PASSWORD] Link gerado com sucesso, enviando email...");

    // Enviar email via Resend
    const emailResponse = await resend.emails.send({
      from: "Tree <noreply@tree.social.br>",
      to: [email],
      subject: "Recuperação de Senha - Tree",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🌳 Tree</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Sua rede familiar</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px;">
              <h2 style="color: #18181b; margin: 0 0 16px; font-size: 20px;">Recuperação de Senha</h2>
              
              <p style="color: #52525b; margin: 0 0 24px; line-height: 1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta Tree. 
                Clique no botão abaixo para criar uma nova senha:
              </p>
              
              <a href="${recoveryLink}" 
                 style="display: block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; text-align: center; margin-bottom: 24px;">
                Redefinir Minha Senha
              </a>
              
              <p style="color: #71717a; font-size: 13px; margin: 0 0 16px; line-height: 1.5;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
              </p>
              
              <p style="background: #f4f4f5; padding: 12px; border-radius: 6px; font-size: 12px; color: #52525b; word-break: break-all; margin: 0 0 24px;">
                ${recoveryLink}
              </p>
              
              <div style="border-top: 1px solid #e4e4e7; padding-top: 24px;">
                <p style="color: #a1a1aa; font-size: 12px; margin: 0; line-height: 1.5;">
                  ⚠️ Este link expira em 1 hora. Se você não solicitou a recuperação de senha, 
                  pode ignorar este email com segurança.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #fafafa; padding: 20px 32px; text-align: center;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Tree - Conectando famílias
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("[RESET PASSWORD] Email enviado com sucesso:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Email de recuperação enviado" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[RESET PASSWORD] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
