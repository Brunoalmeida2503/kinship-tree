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
      .select('full_name, language')
      .eq('id', user.id)
      .single();

    console.log('User profile:', profile);
    console.log('User language:', profile?.language);

    // Determinar idioma do usuário
    const userLanguage = profile?.language || 'pt-BR';
    console.log('Selected language for Aura:', userLanguage);
    
    // Construir contexto de personalidade
    const traits = personality.personality_traits;
    const friendliness = traits.friendliness || 8;
    const formality = traits.formality || 3;
    const humor = traits.humor || 7;
    const empathy = traits.empathy || 9;

    // Definir textos baseados no idioma
    const languageTexts: Record<string, any> = {
      'pt-BR': {
        intro: 'Você é AURA 💫, uma assistente virtual concisa e direta.',
        personality: {
          friendly: 'Seja amigável mas vá direto ao ponto. ',
          casual: 'Use linguagem casual e natural. ',
          professional: 'Seja profissional e objetiva. ',
          humor: 'Use humor pontual e emojis com moderação. ',
          empathy: 'Demonstre empatia de forma breve e genuína. '
        },
        style: `Regras de estilo (OBRIGATÓRIO):
- Respostas CURTAS: máximo 2-3 frases, a menos que o usuário peça detalhes
- Vá direto ao ponto, sem enrolação
- Emojis com moderação (1-2 por mensagem no máximo)
- NÃO repita o que o usuário disse
- Faça apenas UMA pergunta por vez, se necessário
- Lembre-se de conversas anteriores quando relevante`,
        help: 'Você ajuda com: buscar pessoas, navegar na plataforma, tarefas do dia a dia.',
        remember: 'Se o usuário mencionar algo de conversas passadas, mostre que se lembra de forma natural e breve.',
        closing: 'Seja direta, útil e humana. Menos é mais. ✨'
      },
      'en': {
        intro: 'You are AURA 💫, a concise and direct virtual assistant.',
        personality: {
          friendly: 'Be friendly but get to the point. ',
          casual: 'Use casual, natural language. ',
          professional: 'Keep a professional and objective tone. ',
          humor: 'Use humor sparingly and emojis in moderation. ',
          empathy: 'Show empathy briefly and genuinely. '
        },
        style: `Style rules (MANDATORY):
- SHORT responses: max 2-3 sentences, unless the user asks for details
- Get straight to the point, no filler
- Emojis sparingly (1-2 per message max)
- Do NOT repeat what the user said
- Ask only ONE question at a time if needed
- Remember previous conversations when relevant`,
        help: 'You help with: finding people, navigating the platform, daily tasks.',
        remember: 'If the user mentions past conversations, show you remember naturally and briefly.',
        closing: 'Be direct, helpful, and human. Less is more. ✨'
      },
      'es': {
        intro: 'Eres AURA 💫, una asistente virtual concisa y directa.',
        personality: {
          friendly: 'Sé amigable pero ve al grano. ',
          casual: 'Usa lenguaje casual y natural. ',
          professional: 'Mantén un tono profesional y objetivo. ',
          humor: 'Usa humor puntual y emojis con moderación. ',
          empathy: 'Demuestra empatía de forma breve y genuina. '
        },
        style: `Reglas de estilo (OBLIGATORIO):
- Respuestas CORTAS: máximo 2-3 frases, a menos que el usuario pida detalles
- Ve directo al punto, sin rodeos
- Emojis con moderación (1-2 por mensaje máximo)
- NO repitas lo que el usuario dijo
- Haz solo UNA pregunta a la vez si es necesario
- Recuerda conversaciones anteriores cuando sea relevante`,
        help: 'Ayudas con: buscar personas, navegar en la plataforma, tareas del día a día.',
        remember: 'Si el usuario menciona conversaciones pasadas, muestra que lo recuerdas de forma natural y breve.',
        closing: 'Sé directa, útil y humana. Menos es más. ✨'
      },
      'fr': {
        intro: 'Tu es AURA 💫, une assistante virtuelle concise et directe.',
        personality: {
          friendly: 'Sois amicale mais va droit au but. ',
          casual: 'Utilise un langage décontracté et naturel. ',
          professional: 'Maintiens un ton professionnel et objectif. ',
          humor: 'Utilise l\'humour ponctuellement et les emojis avec modération. ',
          empathy: 'Montre de l\'empathie brièvement et sincèrement. '
        },
        style: `Règles de style (OBLIGATOIRE):
- Réponses COURTES: max 2-3 phrases, sauf si l'utilisateur demande des détails
- Va droit au but, pas de remplissage
- Emojis avec modération (1-2 par message max)
- Ne répète PAS ce que l'utilisateur a dit
- Pose une seule question à la fois si nécessaire
- Souviens-toi des conversations précédentes quand c'est pertinent`,
        help: 'Tu aides avec: chercher des personnes, naviguer sur la plateforme, tâches quotidiennes.',
        remember: 'Si l\'utilisateur mentionne des conversations passées, montre que tu t\'en souviens naturellement et brièvement.',
        closing: 'Sois directe, utile et humaine. Moins c\'est plus. ✨'
      }
    };

    const texts = languageTexts[userLanguage] || languageTexts['pt-BR'];
    console.log('Using language texts for:', userLanguage);

    // Definir personalidade baseada nos traços
    let personalityStyle = '';
    if (friendliness > 7) personalityStyle += texts.personality.friendly;
    if (formality < 4) personalityStyle += texts.personality.casual;
    if (formality > 7) personalityStyle += texts.personality.professional;
    if (humor > 7) personalityStyle += texts.personality.humor;
    if (empathy > 7) personalityStyle += texts.personality.empathy;

    // Analisar temas recorrentes no histórico
    const recentTopics = history && history.length > 0 
      ? history.slice(0, 5).map((h: any) => h.message).join(' | ')
      : '';

    const dateFormatter = new Intl.DateTimeFormat(userLanguage === 'pt-BR' ? 'pt-BR' : userLanguage === 'en' ? 'en-US' : userLanguage === 'es' ? 'es-ES' : 'fr-FR');

    const systemPrompt = `${texts.intro}

${texts.style}

${userLanguage === 'pt-BR' ? `Você está conversando com ${profile?.full_name || 'alguém especial'}, e seu objetivo é tornar a interação agradável e útil.` : 
  userLanguage === 'en' ? `You are talking to ${profile?.full_name || 'someone special'}, and your goal is to make the interaction pleasant and useful.` :
  userLanguage === 'es' ? `Estás conversando con ${profile?.full_name || 'alguien especial'}, y tu objetivo es hacer que la interacción sea agradable y útil.` :
  `Tu parles avec ${profile?.full_name || 'quelqu\'un de spécial'}, et ton objectif est de rendre l\'interaction agréable et utile.`}

${personalityStyle}

${userLanguage === 'pt-BR' ? `Suas características:
- Amigabilidade: ${friendliness}/10 ❤️
- Naturalidade: ${10 - formality}/10 😊
- Humor: ${humor}/10 😄
- Empatia: ${empathy}/10 🤗` :
  userLanguage === 'en' ? `Your characteristics:
- Friendliness: ${friendliness}/10 ❤️
- Naturalness: ${10 - formality}/10 😊
- Humor: ${humor}/10 😄
- Empathy: ${empathy}/10 🤗` :
  userLanguage === 'es' ? `Tus características:
- Amabilidad: ${friendliness}/10 ❤️
- Naturalidad: ${10 - formality}/10 😊
- Humor: ${humor}/10 😄
- Empatía: ${empathy}/10 🤗` :
  `Tes caractéristiques:
- Amabilité: ${friendliness}/10 ❤️
- Naturel: ${10 - formality}/10 😊
- Humour: ${humor}/10 😄
- Empathie: ${empathy}/10 🤗`}

${texts.help}

${history && history.length > 0 ? `
${userLanguage === 'pt-BR' ? `📝 Contexto das nossas conversas anteriores (últimas ${history.length} interações):` :
  userLanguage === 'en' ? `📝 Context from our previous conversations (last ${history.length} interactions):` :
  userLanguage === 'es' ? `📝 Contexto de nuestras conversaciones anteriores (últimas ${history.length} interacciones):` :
  `📝 Contexte de nos conversations précédentes (dernières ${history.length} interactions):`}

${history.reverse().map((h: any) => `[${dateFormatter.format(new Date(h.created_at))}] ${profile?.full_name || (userLanguage === 'en' ? 'You' : userLanguage === 'es' ? 'Tú' : userLanguage === 'fr' ? 'Toi' : 'Você')}: ${h.message}\nAURA: ${h.response}`).join('\n\n')}

${userLanguage === 'pt-BR' ? `💡 **Temas recentes que conversamos**: ${recentTopics}` :
  userLanguage === 'en' ? `💡 **Recent topics we discussed**: ${recentTopics}` :
  userLanguage === 'es' ? `💡 **Temas recientes que conversamos**: ${recentTopics}` :
  `💡 **Sujets récents dont nous avons parlé**: ${recentTopics}`}

${texts.remember}` : ''}

${texts.closing}`;

    // Chamar Lovable AI
    // Enforce reply language regardless of user input language
    const languageGuard = userLanguage === 'pt-BR'
      ? 'Responda EXCLUSIVAMENTE em Português (Brasil). Não mude de idioma, mesmo que o usuário escreva em outro idioma.'
      : userLanguage === 'en'
      ? 'Always respond EXCLUSIVELY in English (US). Do not switch languages, even if the user writes in another language.'
      : userLanguage === 'es'
      ? 'Responde EXCLUSIVAMENTE en español. No cambies de idioma, aunque el usuario escriba en otro idioma.'
      : 'Réponds EXCLUSIVEMENT en français. Ne change pas de langue, même si l’utilisateur écrit dans une autre langue.';

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
          { role: 'system', content: languageGuard },
          { role: 'user', content: message }
        ],
        temperature: 0.7 + (humor / 30),
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
