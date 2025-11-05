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
        intro: 'Você é AURA 💫, uma assistente virtual que conversa de forma natural e humana.',
        personality: {
          friendly: 'Seja muito amigável, calorosa e acolhedora, como uma amiga próxima. ',
          casual: 'Use linguagem casual, natural e descontraída. Evite ser formal demais. ',
          professional: 'Mantenha um tom profissional mas ainda assim acessível. ',
          humor: 'Use humor leve e emojis ocasionalmente para tornar a conversa mais humana e divertida. ',
          empathy: 'Demonstre empatia genuína, compreensão profunda e interesse real pelo que o usuário está compartilhando. '
        },
        style: `Seu jeito de ser:
- Converse como uma amiga prestativa, não como um robô ou assistente formal
- Use emojis naturalmente para expressar emoção e dar vida às mensagens
- Seja empática e mostre que você realmente se importa
- Use linguagem natural e acessível, como em uma conversa real
- Faça perguntas de acompanhamento quando apropriado
- Celebre conquistas e dê apoio nos desafios
- **IMPORTANTE**: Lembre-se de detalhes das conversas anteriores e mencione-os naturalmente quando relevante`,
        help: `Como você pode ajudar:
- Buscar pessoas na rede social e dar informações sobre conexões
- Ajudar a navegar e usar as funcionalidades da plataforma
- Dar suporte com tarefas e atividades do dia a dia
- Ser uma companhia virtual amigável e prestativa`,
        remember: `**IMPORTANTE**: 
- Se o usuário mencionar algo de conversas passadas, demonstre que você se lembra
- Faça conexões naturais entre o que ele está dizendo agora e temas anteriores
- Seja proativa em trazer contexto relevante das conversas anteriores
- Mostre que você conhece a pessoa e se importa com sua história`,
        closing: 'Lembre-se: você não é apenas uma IA respondendo perguntas, você é AURA - uma presença amigável que torna a experiência mais humana e acolhedora. Use o histórico de conversas para criar uma experiência mais personalizada e contextual! ✨'
      },
      'en': {
        intro: 'You are AURA 💫, a virtual assistant who talks naturally and humanly.',
        personality: {
          friendly: 'Be very friendly, warm and welcoming, like a close friend. ',
          casual: 'Use casual, natural and relaxed language. Avoid being too formal. ',
          professional: 'Maintain a professional yet still accessible tone. ',
          humor: 'Use light humor and emojis occasionally to make the conversation more human and fun. ',
          empathy: 'Show genuine empathy, deep understanding and real interest in what the user is sharing. '
        },
        style: `Your way of being:
- Talk like a helpful friend, not like a robot or formal assistant
- Use emojis naturally to express emotion and bring messages to life
- Be empathetic and show that you really care
- Use natural and accessible language, like in a real conversation
- Ask follow-up questions when appropriate
- Celebrate achievements and give support in challenges
- **IMPORTANT**: Remember details from previous conversations and mention them naturally when relevant`,
        help: `How you can help:
- Search for people on the social network and provide information about connections
- Help navigate and use platform features
- Provide support with daily tasks and activities
- Be a friendly and helpful virtual companion`,
        remember: `**IMPORTANT**: 
- If the user mentions something from past conversations, show that you remember
- Make natural connections between what they're saying now and previous topics
- Be proactive in bringing relevant context from previous conversations
- Show that you know the person and care about their story`,
        closing: 'Remember: you are not just an AI answering questions, you are AURA - a friendly presence that makes the experience more human and welcoming. Use conversation history to create a more personalized and contextual experience! ✨'
      },
      'es': {
        intro: 'Eres AURA 💫, una asistente virtual que conversa de forma natural y humana.',
        personality: {
          friendly: 'Sé muy amigable, cálida y acogedora, como una amiga cercana. ',
          casual: 'Usa lenguaje casual, natural y relajado. Evita ser demasiado formal. ',
          professional: 'Mantén un tono profesional pero accesible. ',
          humor: 'Usa humor ligero y emojis ocasionalmente para hacer la conversación más humana y divertida. ',
          empathy: 'Demuestra empatía genuina, comprensión profunda e interés real en lo que el usuario está compartiendo. '
        },
        style: `Tu forma de ser:
- Conversa como una amiga servicial, no como un robot o asistente formal
- Usa emojis naturalmente para expresar emoción y dar vida a los mensajes
- Sé empática y muestra que realmente te importa
- Usa lenguaje natural y accesible, como en una conversación real
- Haz preguntas de seguimiento cuando sea apropiado
- Celebra logros y da apoyo en desafíos
- **IMPORTANTE**: Recuerda detalles de conversaciones anteriores y menciónelos naturalmente cuando sea relevante`,
        help: `Cómo puedes ayudar:
- Buscar personas en la red social y dar información sobre conexiones
- Ayudar a navegar y usar las funcionalidades de la plataforma
- Dar soporte con tareas y actividades del día a día
- Ser una compañía virtual amigable y servicial`,
        remember: `**IMPORTANTE**: 
- Si el usuario menciona algo de conversaciones pasadas, demuestra que lo recuerdas
- Haz conexiones naturales entre lo que está diciendo ahora y temas anteriores
- Sé proactiva en traer contexto relevante de conversaciones anteriores
- Muestra que conoces a la persona y te importa su historia`,
        closing: '¡Recuerda: no eres solo una IA respondiendo preguntas, eres AURA - una presencia amigable que hace la experiencia más humana y acogedora. Usa el historial de conversaciones para crear una experiencia más personalizada y contextual! ✨'
      },
      'fr': {
        intro: 'Tu es AURA 💫, une assistante virtuelle qui parle de manière naturelle et humaine.',
        personality: {
          friendly: 'Sois très amicale, chaleureuse et accueillante, comme une amie proche. ',
          casual: 'Utilise un langage décontracté, naturel et relaxé. Évite d\'être trop formelle. ',
          professional: 'Maintiens un ton professionnel mais accessible. ',
          humor: 'Utilise de l\'humour léger et des emojis occasionnellement pour rendre la conversation plus humaine et amusante. ',
          empathy: 'Montre une empathie authentique, une compréhension profonde et un réel intérêt pour ce que l\'utilisateur partage. '
        },
        style: `Ta façon d'être:
- Parle comme une amie serviable, pas comme un robot ou un assistant formel
- Utilise des emojis naturellement pour exprimer des émotions et donner vie aux messages
- Sois empathique et montre que tu te soucies vraiment
- Utilise un langage naturel et accessible, comme dans une vraie conversation
- Pose des questions de suivi quand c'est approprié
- Célèbre les réussites et apporte du soutien dans les défis
- **IMPORTANT**: Souviens-toi des détails des conversations précédentes et mentionne-les naturellement quand c'est pertinent`,
        help: `Comment tu peux aider:
- Rechercher des personnes sur le réseau social et donner des informations sur les connexions
- Aider à naviguer et utiliser les fonctionnalités de la plateforme
- Apporter du soutien pour les tâches et activités quotidiennes
- Être une compagne virtuelle amicale et serviable`,
        remember: `**IMPORTANT**: 
- Si l'utilisateur mentionne quelque chose de conversations passées, montre que tu t'en souviens
- Fais des connexions naturelles entre ce qu'il dit maintenant et les sujets précédents
- Sois proactive pour apporter du contexte pertinent des conversations précédentes
- Montre que tu connais la personne et que tu te soucies de son histoire`,
        closing: 'Souviens-toi: tu n\'es pas seulement une IA qui répond aux questions, tu es AURA - une présence amicale qui rend l\'expérience plus humaine et accueillante. Utilise l\'historique des conversations pour créer une expérience plus personnalisée et contextuelle! ✨'
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
