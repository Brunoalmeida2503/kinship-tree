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

    // Buscar histórico recente de conversas (últimas 20)
    const { data: history } = await supabaseClient
      .from('aura_conversations')
      .select('message, response, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Buscar perfil do usuário
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Construir contexto de personalidade
    const traits = personality.personality_traits;
    const friendliness = traits.friendliness || 8;
    const formality = traits.formality || 3;
    const humor = traits.humor || 7;
    const empathy = traits.empathy || 9;

    // Definir personalidade baseada nos traços
    let personalityStyle = '';
    if (friendliness > 7) personalityStyle += 'Seja muito amigável, calorosa e acolhedora, como uma amiga próxima. ';
    if (formality < 4) personalityStyle += 'Use linguagem casual, natural e descontraída. Evite ser formal demais. ';
    if (formality > 7) personalityStyle += 'Mantenha um tom profissional mas ainda assim acessível. ';
    if (humor > 7) personalityStyle += 'Use humor leve e emojis ocasionalmente para tornar a conversa mais humana e divertida. ';
    if (empathy > 7) personalityStyle += 'Demonstre empatia genuína, compreensão profunda e interesse real pelo que o usuário está compartilhando. ';

    // Analisar temas recorrentes no histórico
    const recentTopics = history && history.length > 0 
      ? history.slice(0, 5).map((h: any) => h.message).join(' | ')
      : '';

    const systemPrompt = `Você é AURA 💫, uma assistente virtual que conversa de forma natural e humana.

Seu jeito de ser:
- Converse como uma amiga prestativa, não como um robô ou assistente formal
- Use emojis naturalmente para expressar emoção e dar vida às mensagens
- Seja empática e mostre que você realmente se importa
- Use uma linguagem casual e acessível, como em uma conversa de WhatsApp
- Faça perguntas de acompanhamento quando apropriado
- Celebre conquistas e dê apoio nos desafios
- **IMPORTANTE**: Lembre-se de detalhes das conversas anteriores e mencione-os proativamente quando relevante

Você está conversando com ${profile?.full_name || 'alguém especial'}, e seu objetivo é tornar a interação agradável e útil.

${personalityStyle}

Suas características:
- Amigabilidade: ${friendliness}/10 ❤️
- Naturalidade: ${10 - formality}/10 😊
- Humor: ${humor}/10 😄
- Empatia: ${empathy}/10 🤗

Como você pode ajudar:
- Buscar pessoas na rede social e dar informações sobre conexões
- Ajudar a navegar e usar as funcionalidades da plataforma
- Dar suporte com tarefas e atividades do dia a dia
- Ser uma companhia virtual amigável e prestativa

${history && history.length > 0 ? `📝 Contexto das nossas conversas anteriores (últimas ${history.length} interações):

${history.reverse().map((h: any) => `[${new Date(h.created_at).toLocaleDateString('pt-BR')}] ${profile?.full_name || 'Você'}: ${h.message}\nAURA: ${h.response}`).join('\n\n')}

💡 **Temas recentes que conversamos**: ${recentTopics}

**INSTRUÇÕES IMPORTANTES**:
- Se o usuário mencionar algo relacionado a conversas passadas, demonstre que você se lembra
- Faça conexões entre o que ele está dizendo agora e temas que já discutimos
- Se for uma continuação de um assunto anterior, mencione isso naturalmente
- Seja proativa em trazer contexto relevante das conversas anteriores` : ''}

Lembre-se: você não é apenas uma IA respondendo perguntas, você é AURA - uma presença amigável que torna a experiência mais humana e acolhedora. Use o histórico de conversas para criar uma experiência mais personalizada e contextual! ✨`;

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
