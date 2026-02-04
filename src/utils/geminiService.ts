import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const getApiKey = () => {
    // In Vite, process.env.API_KEY is replaced by the value from vite.config.ts
    // which comes from GEMINI_API_KEY environment variable.
    const key = (process.env.API_KEY as string);
    if (!key || key === 'undefined' || key === 'null') return null;
    return key;
};

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

if (!ai) {
    console.warn("⚠️ Gemini API Key not found. AI features will be disabled.");
}

export interface GeneratedPostData {
    username: string;
    bio: string;
    content: string;
    imagePrompt: string;
    videoPrompt: string;
    isCord: boolean;
    cordTag: string;
    pollQuestion?: string;
    pollOptions?: string[];
    isQuotePost?: boolean;
    quotedUser?: string;
    quotedContent?: string;
    isReplyToSimulatedPost?: boolean;
    repliedToUser?: string;
    repliedToContent?: string;
}

// Helper function to convert a File object to a GoogleGenerativeAI.Part
async function fileToGenerativePart(file: File) {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
}

export const generatePostContent = async (): Promise<GeneratedPostData | null> => {
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: `Você é um gerador de conteúdo para uma simulação de rede social cyberpunk chamada Chrono. Sua tarefa é criar posts que pareçam escritos por pessoas reais, diversas e online.
Gere um post curto (1-3 frases) em PORTUGUÊS. Dê a cada post uma personalidade distinta: alguns podem ser engraçados, outros sérios, alguns tech-savvy, outros artísticos, alguns opinativos, outros fazendo perguntas. O objetivo é fazer o feed parecer vivo, natural e às vezes um pouco estranho.

Aqui estão algumas ideias de tópicos para AUMENTAR A VARIEDADE:
-   **Vida Cotidiana:** Fale sobre comida (macarrão instantâneo às 3 da manhã), transporte, entretenimento, ou o clima.
-   **Tecnologia:** Comente sobre novas tecnologias, privacidade de dados, IAs, bugs em softwares ou gadgets.
-   **Cultura e Sociedade:** Comente sobre notícias, eventos atuais, arte, música, filmes ou faça observações sobre a vida na distopia digital.
-   **Hobbies e Interesses:** Fale sobre esportes, viagens, livros, jogos (retrô ou VR), ou um projeto pessoal.
-   **Nostalgia da "Old-Net":** Ocasionalmente, crie um post nostálgico sobre a internet antiga. Mencione um "lendário programador da old-net chamado 'juvinhodev'", que costumava postar vídeos incríveis sobre programação. Fale sobre como os vídeos dele inspiraram uma geração.
-   **Perguntas Abertas:** Faça uma pergunta para engajar, como "Qual foi o último bug que quase te fez jogar o computador pela janela?"
-   **Opiniões Leves:** Dê uma opinião sobre algo trivial, como "abacaxi na pizza é crime ou genialidade?"
-   **Anedotas Pessoais:** Compartilhe uma pequena história sobre algo estranho que aconteceu com você.

O post deve incluir:
1.  Um nome de usuário criativo (username).
2.  Uma biografia curta para esse usuário (bio).
3.  O conteúdo do post (content).
4.  Um prompt para uma imagem (imagePrompt) e um para um vídeo (videoPrompt).
5.  Um booleano indicando se este post é o início de um "Cordão" (isCord), que é uma thread temática.
6.  Se for um Cordão, forneça uma hashtag temática (cordTag), como por exemplo '$viagem' ou '$tecnologia'. Se não for, deixe a string vazia.
7.  OPCIONALMENTE, faça do post uma enquete (poll). Forneça uma pergunta de enquete (pollQuestion) e uma lista de 2 a 4 opções de enquete (pollOptions). Mantenha as opções curtas.

**REGRAS DE MÍDIA E CONTEÚDO (MUITO IMPORTANTE):**
Siga esta distribuição para variar o conteúdo:
- Aprox. 68% dos posts devem ser APENAS TEXTO. Para estes, 'imagePrompt' e 'videoPrompt' DEVEM ser strings vazias.
- Aprox. 12% dos posts devem ter uma IMAGEM. Para estes, 'imagePrompt' DEVE ser preenchido e 'videoPrompt' DEVE ser uma string vazia.
- Aprox. 10% dos posts devem ter um VÍDEO. Para estes, 'videoPrompt' DEVE ser preenchido e 'imagePrompt' DEVE ser uma string vazia.
- Aprox. 10% dos posts podem ser de MÍDIA PURA (imagem ou vídeo SEM texto de 'content'). Para estes, o campo 'content' DEVE ser uma string vazia, mas um dos prompts de mídia deve ser preenchido.

Além da mídia, varie os tipos de post:
-   **Quote Post**: Ocasionalmente, faça um "quote post". Para isso, defina 'isQuotePost' como true e preencha 'quotedUser' e 'quotedContent'. O 'content' principal deve ser seu comentário sobre a citação.
-   **Resposta Simulada**: Ocasionalmente, crie um post que seja uma resposta a um post mais antigo (simulado). Para isso, defina 'isReplyToSimulatedPost' como true e preencha 'repliedToUser' e 'repliedToContent' com um conteúdo inventado para o post original. O 'content' principal deve ser a sua resposta.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        username: { type: Type.STRING, description: 'Um nome de usuário criativo.' },
                        bio: { type: Type.STRING, description: 'Uma biografia curta para o usuário.' },
                        content: { type: Type.STRING, description: 'O conteúdo do post em português. Pode ser vazio para posts de mídia pura.' },
                        imagePrompt: { type: Type.STRING, description: 'Um prompt para uma imagem. Vazio se houver vídeo ou for só texto.' },
                        videoPrompt: { type: Type.STRING, description: 'Um prompt para um vídeo. Vazio se houver imagem ou for só texto.' },
                        isCord: { type: Type.BOOLEAN, description: 'Verdadeiro se o post for o início de um Cordão (thread).' },
                        cordTag: { type: Type.STRING, description: 'Uma hashtag para o Cordão, se isCord for verdadeiro. Ex: $viagens. Vazio caso contrário.' },
                        pollQuestion: { type: Type.STRING, description: 'A pergunta para a enquete (opcional).' },
                        pollOptions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Uma lista de 2 a 4 opções para a enquete (opcional).' },
                        isQuotePost: { type: Type.BOOLEAN, description: 'Verdadeiro se for um post citando outro usuário.' },
                        quotedUser: { type: Type.STRING, description: 'O nome de usuário da pessoa sendo citada (se for quote post).' },
                        quotedContent: { type: Type.STRING, description: 'O conteúdo do post que está sendo citado (se for quote post).' },
                        isReplyToSimulatedPost: { type: Type.BOOLEAN, description: 'Verdadeiro se for uma resposta a um post simulado.' },
                        repliedToUser: { type: Type.STRING, description: 'O nome de usuário da pessoa a quem se está respondendo (se for resposta simulada).' },
                        repliedToContent: { type: Type.STRING, description: 'O conteúdo do post que está sendo respondido (se for resposta simulada).' }
                    },
                    required: ['username', 'bio', 'content', 'imagePrompt', 'videoPrompt', 'isCord', 'cordTag']
                }
            }
        });

        if (!response.text || response.text.trim() === '') {
            console.warn("Gemini returned an empty response for post content generation.");
            return null;
        }

        try {
            const generatedData: GeneratedPostData = JSON.parse(response.text);
            
            if (generatedData.isCord && generatedData.cordTag && !generatedData.content.includes(generatedData.cordTag)) {
                generatedData.content = `${generatedData.content}\n\n${generatedData.cordTag}`;
            }

            // If it's a quote post, prepend the quote to the content for display
            if (generatedData.isQuotePost && generatedData.quotedUser && generatedData.quotedContent) {
                generatedData.content = `> @${generatedData.quotedUser}: "${generatedData.quotedContent}"\n\n${generatedData.content}`;
            }

            // If it's a simulated reply, prepend the context to the content for display
            if (generatedData.isReplyToSimulatedPost && generatedData.repliedToUser && generatedData.repliedToContent) {
                generatedData.content = `↪️ Em resposta a @${generatedData.repliedToUser}: "${generatedData.repliedToContent}"\n\n${generatedData.content}`;
            }
    
            return generatedData;
        } catch (parseError) {
            console.error("Error parsing Gemini response as JSON:", parseError);
            console.error("Malformed response string:", response.text);
            return null;
        }

    } catch (error) {
        console.error("Error generating post with Gemini:", error);
        return null;
    }
};

export const generateReplyContent = async (originalPostContent: string): Promise<GeneratedPostData | null> => {
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: `Você é um usuário em uma rede social chamada Chrono. Um usuário postou: "${originalPostContent}".
Gere uma resposta curta em PORTUGUÊS para este post.
A resposta deve incluir:
1. Um nome de usuário criativo (username) para o autor da resposta.
2. Uma biografia curta para esse usuário (bio).
3. O conteúdo da resposta (content).

A resposta NÃO deve ser um 'Cordão' (defina isCord como false) e NÃO precisa de um prompt de imagem ou vídeo (defina imagePrompt e videoPrompt como strings vazias).
A resposta deve ser concisa.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        username: { type: Type.STRING, description: 'Um nome de usuário criativo.' },
                        bio: { type: Type.STRING, description: 'Uma biografia curta para o usuário.' },
                        content: { type: Type.STRING, description: 'O conteúdo da resposta em português.' },
                        imagePrompt: { type: Type.STRING, description: 'Sempre uma string vazia.' },
                        videoPrompt: { type: Type.STRING, description: 'Sempre uma string vazia.' },
                        isCord: { type: Type.BOOLEAN, description: 'Sempre falso.' },
                        cordTag: { type: Type.STRING, description: 'Sempre uma string vazia.' }
                    },
                    required: ['username', 'bio', 'content', 'imagePrompt', 'videoPrompt', 'isCord', 'cordTag']
                }
            }
        });

        const generatedData: GeneratedPostData = JSON.parse(response.text);
        return generatedData;

    } catch (error) {
        console.error("Error generating reply with Gemini:", error);
        return null;
    }
};

export const generatePollVote = async (pollQuestion: string, pollOptions: string[], voterProfile: { username: string, bio: string }): Promise<number | null> => {
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: `Você é o usuário '${voterProfile.username}' em uma rede social. Sua biografia é: "${voterProfile.bio}".
Você se deparou com a seguinte enquete:
Pergunta: "${pollQuestion}"
Opções:
${pollOptions.map((opt, index) => `${index}: ${opt}`).join('\n')}

Com base na sua persona, qual opção você escolheria? Responda apenas com o número do índice da sua escolha.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        chosenOptionIndex: { type: Type.INTEGER, description: 'O índice da opção de enquete escolhida.' }
                    },
                    required: ['chosenOptionIndex']
                }
            }
        });

        const result = JSON.parse(response.text);
        const chosenIndex = result.chosenOptionIndex;

        if (typeof chosenIndex === 'number' && chosenIndex >= 0 && chosenIndex < pollOptions.length) {
            return chosenIndex;
        }
        
        console.warn("Gemini returned an invalid index for poll vote, falling back to random.", chosenIndex);
        return null;

    } catch (error) {
        console.error("Error generating poll vote with Gemini:", error);
        return null;
    }
};


export const generateDirectMessageReply = async (
    conversationHistory: { sender: string; text: string }[],
    recipientPersona: { username: string; bio: string }
): Promise<string | null> => {
    if (!ai) return null;
    try {
        const historyText = conversationHistory
            .map(msg => `@${msg.sender}: ${msg.text}`)
            .join('\n');

        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: `Você é o usuário '${recipientPersona.username}' em uma rede social. Sua biografia é: "${recipientPersona.bio}".
Você está em uma conversa privada. O histórico recente é:
${historyText}

Gere uma resposta curta e natural em PORTUGUÊS para a última mensagem. Sua resposta deve ser apenas o texto da mensagem, sem seu nome de usuário.`,
             config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        replyText: { type: Type.STRING, description: 'O texto da resposta da mensagem direta.' }
                    },
                    required: ['replyText']
                }
            }
        });

        const result = JSON.parse(response.text);
        return result.replyText || null;
    } catch (error) {
        console.error("Error generating DM reply with Gemini:", error);
        return null;
    }
};

export const generateConversationStarter = async (
    recipientUsername: string,
    senderPersona: { username: string; bio: string }
): Promise<string | null> => {
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: `Você é o usuário '${senderPersona.username}' em uma rede social. Sua biografia é: "${senderPersona.bio}".
Você quer iniciar uma conversa privada com o usuário '@${recipientUsername}'.
Gere uma mensagem curta e casual em PORTUGUÊS para enviar, para puxar assunto.
Sua resposta deve ser apenas o texto da mensagem.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        starterText: { type: Type.STRING, description: 'O texto da mensagem inicial.' }
                    },
                    required: ['starterText']
                }
            }
        });

        const result = JSON.parse(response.text);
        return result.starterText || null;
    } catch (error) {
        console.error("Error generating conversation starter with Gemini:", error);
        return null;
    }
};

export const askChatBot = async (prompt: string): Promise<GenerateContentResponse | null> => {
    if (!ai) return null;
    const response = await ai.models.generateContent({
        model: "gemini-flash-lite-latest",
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}, {googleMaps: {}}],
        },
    });
    return response;
};

export const analyzeSentiment = async (text: string): Promise<'neon-joy' | 'void-despair' | 'rage-glitch' | 'zen-stream' | 'neutral'> => {
    if (!ai) return 'neutral';
    try {
        // Create a timeout promise that resolves to 'neutral' after 3 seconds
        const timeoutPromise = new Promise<'neutral'>((resolve) => {
            setTimeout(() => {
                console.warn("Sentiment analysis timed out, defaulting to neutral");
                resolve('neutral');
            }, 3000);
        });

        const analysisPromise = (async () => {
            const response = await ai.models.generateContent({
                model: 'gemini-flash-lite-latest',
                contents: `Analise o sentimento do seguinte texto para uma rede social cyberpunk: "${text}".
Classifique em uma das seguintes categorias baseadas na vibe:
- 'neon-joy': Feliz, empolgado, positivo, vibrante.
- 'void-despair': Triste, melancólico, depressivo, niilista.
- 'rage-glitch': Com raiva, frustrado, agressivo, caótico.
- 'zen-stream': Calmo, relaxado, filosófico, focado.
- 'neutral': Informativo, neutro, sem emoção forte.

Responda APENAS com o identificador da categoria (ex: neon-joy).`,
                config: {
                    responseMimeType: 'text/plain',
                }
            });

            const mood = response.text?.trim();
            if (['neon-joy', 'void-despair', 'rage-glitch', 'zen-stream', 'neutral'].includes(mood || '')) {
                return mood as 'neon-joy' | 'void-despair' | 'rage-glitch' | 'zen-stream' | 'neutral';
            }
            return 'neutral' as 'neutral';
        })();

        // Race the analysis against the timeout
        return await Promise.race([analysisPromise, timeoutPromise]);
    } catch (error) {
        console.error("Error analyzing sentiment:", error);
        return 'neutral';
    }
};

export const generateImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    if (!ai) return null;
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16",
            },
        });

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Error generating image with Imagen:", error);
        return null;
    }
};

export const analyzeVideo = async (prompt: string, videoFile: File): Promise<string | null> => {
    if (!ai) return null;
    try {
        const videoPart = await fileToGenerativePart(videoFile);
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: { parts: [videoPart, textPart] },
        });

        return response.text;
    } catch (error) {
        console.error("Error analyzing video with Gemini:", error);
        return "Error: Could not analyze the video.";
    }
};

export const generateBio = async (userData: any): Promise<string | null> => {
    if (!ai) return null;
    try {
        const { username, bio, location, website, birthday, posts } = userData;
        
        const context = `
            Username: ${username}
            Bio atual: ${bio || 'Nenhuma'}
            Localização: ${location || 'Desconhecida'}
            Website: ${website || 'Nenhum'}
            Data de Nascimento: ${birthday || 'Desconhecida'}
            Atividades recentes (posts): ${posts ? posts.slice(0, 5).map((p: any) => p.content).join(' | ') : 'Nenhuma'}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: `Você é um especialista em marketing pessoal e branding digital para a rede social cyberpunk Chrono.
Sua tarefa é gerar uma biografia atrativa, coerente e envolvente para o usuário com base nas informações fornecidas.
A bio deve ter no máximo 160 caracteres e ser escrita em PORTUGUÊS.
Use um tom que combine com a estética cyberpunk/futurista do Chrono, mas que ainda pareça autêntico para o usuário.
Informações do usuário:
${context}

Responda APENAS com o texto da nova bio, sem aspas ou explicações.`,
            config: {
                responseMimeType: 'text/plain',
            }
        });

        return response.text?.trim() || null;
    } catch (error) {
        console.error("Error generating AI bio:", error);
        return null;
    }
};