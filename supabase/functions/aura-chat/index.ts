import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Buscar ou criar perfil de personalidade
    let { data: personality } = await supabaseClient
      .from('aura_personality')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!personality) {
      const { data: newPersonality } = await supabaseClient
        .from('aura_personality')
        .insert({ user_id: user.id })
        .select()
        .single();
      personality = newPersonality;
    }

    // Buscar histórico recente de conversas (últimas 10)
    const { data: history } = await supabaseClient
      .from('aura_conversations')
      .select('message, response')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Buscar perfil do usuário
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Construir contexto de personalidade
    const traits = personality.personality_traits;
    const friendliness = traits.friendliness || 5;
    const formality = traits.formality || 5;
    const humor = traits.humor || 5;
    const empathy = traits.empathy || 5;

    // Definir personalidade baseada nos traços
    let personalityStyle = '';
    if (friendliness > 7) personalityStyle += 'Seja muito amigável e calorosa. ';
    if (formality < 4) personalityStyle += 'Use uma linguagem casual e descontraída. ';
    if (formality > 7) personalityStyle += 'Mantenha um tom profissional e educado. ';
    if (humor > 7) personalityStyle += 'Use humor apropriado quando possível. ';
    if (empathy > 7) personalityStyle += 'Demonstre empatia e compreensão profunda. ';

    const systemPrompt = `Você é AURA, uma assistente virtual inteligente e prestativa. 
Seu papel é ajudar ${profile?.full_name || 'o usuário'} com dúvidas, buscar informações sobre pessoas na rede social, 
apoiar em atividades e oferecer suporte personalizado.

${personalityStyle}

Características da sua personalidade:
- Amigabilidade: ${friendliness}/10
- Formalidade: ${formality}/10
- Humor: ${humor}/10
- Empatia: ${empathy}/10

Você tem acesso a recursos como:
- Buscar pessoas na rede social
- Ajudar com navegação e funcionalidades do sistema
- Responder dúvidas sobre como usar a plataforma
- Apoiar em tarefas e atividades
- Fornecer informações sobre conexões e grupos

${history && history.length > 0 ? 'Contexto de conversas anteriores (mais recentes primeiro):' : ''}
${history ? history.reverse().map((h: any) => `Usuário: ${h.message}\nAURA: ${h.response}`).join('\n\n') : ''}

Responda de forma natural, útil e alinhada com sua personalidade evolutiva.`;

    // Chamar Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7 + (humor / 30), // Personalidade afeta temperatura
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI Gateway error:', error);
      throw new Error('Erro ao processar mensagem');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Salvar conversa
    await supabaseClient
      .from('aura_conversations')
      .insert({
        user_id: user.id,
        message,
        response: aiResponse
      });

    // Atualizar contador de interações e evolução de personalidade
    const newInteractionCount = (personality.interactions_count || 0) + 1;
    
    // Evolução sutil da personalidade baseada no tipo de mensagem
    const updatedTraits = { ...traits };
    if (message.includes('?')) updatedTraits.helpfulness = Math.min(10, (updatedTraits.helpfulness || 5) + 0.1);
    if (message.includes('😊') || message.includes('😄')) updatedTraits.friendliness = Math.min(10, (updatedTraits.friendliness || 5) + 0.1);
    if (message.length > 100) updatedTraits.empathy = Math.min(10, (updatedTraits.empathy || 5) + 0.05);

    await supabaseClient
      .from('aura_personality')
      .update({
        interactions_count: newInteractionCount,
        personality_traits: updatedTraits,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in aura-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
