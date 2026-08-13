import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const provider = process.env.AI_PROVIDER || "openai";
const apiKey = process.env.AI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "";
const baseUrl = process.env.AI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "";

// Validate API Key presence
if (!apiKey) {
  throw new Error("AI API Key must be set (via AI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY).");
}

// Instantiate clients
const realOpenAI = new OpenAI({
  apiKey: apiKey,
  baseURL: baseUrl || undefined,
});

let googleGenAI: GoogleGenerativeAI | null = null;
if (provider === "google") {
  googleGenAI = new GoogleGenerativeAI(apiKey);
}

// Custom wrapper mimicking the OpenAI client shape (typed as any to prevent TS compilation errors in consumer routes)
export const openai: any = {
  chat: {
    completions: {
      create: async (params: any): Promise<any> => {
        if (provider === "google") {
          const modelName = process.env.AI_CHAT_MODEL || "gemini-1.5-flash";
          if (!googleGenAI) {
            throw new Error("Google Generative AI client is not initialized.");
          }

          // Extract system prompt
          const systemMessage = params.messages.find((m: any) => m.role === "system");
          const systemInstruction = systemMessage ? systemMessage.content : undefined;

          // Map chat messages (system messages are configured in Gemini via model setup systemInstruction)
          const chatMessages = params.messages.filter((m: any) => m.role !== "system");
          const contents = chatMessages.map((m: any) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

          const configuredModel = googleGenAI.getGenerativeModel({
            model: modelName,
            systemInstruction,
          });

          if (params.stream) {
            const result = await configuredModel.generateContentStream({
              contents,
              generationConfig: {
                maxOutputTokens: params.max_completion_tokens || params.max_tokens,
              },
            });

            return {
              [Symbol.asyncIterator]: async function* () {
                for await (const chunk of result.stream) {
                  yield {
                    choices: [
                      {
                        delta: {
                          content: chunk.text(),
                        },
                      },
                    ],
                  };
                }
              },
            };
          } else {
            const result = await configuredModel.generateContent({
              contents,
              generationConfig: {
                maxOutputTokens: params.max_completion_tokens || params.max_tokens,
              },
            });

            const text = result.response.text();
            return {
              choices: [
                {
                  message: {
                    content: text,
                    role: "assistant",
                  },
                },
              ],
            };
          }
        }

        // OpenAI Fallback
        const modelName = process.env.AI_CHAT_MODEL || params.model;
        return realOpenAI.chat.completions.create({
          ...params,
          model: modelName,
        });
      },
    },
  },

  images: {
    generate: async (params: any): Promise<any> => {
      if (provider === "google") {
        const modelName = process.env.AI_IMAGE_MODEL || "gemini-2.5-flash-image";
        const prompt = params.prompt;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ["IMAGE"],
              },
            }),
          }
        );

        if (!response.ok) {
          const errData = (await response.json().catch(() => ({}))) as any;
          throw new Error(errData.error?.message || `Google Image API error: ${response.statusText}`);
        }

        const data = (await response.json()) as any;
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData);
        const b64_json = imagePart?.inlineData?.data;

        if (!b64_json) {
          throw new Error("No image data returned from Google Image API");
        }

        return {
          data: [
            {
              b64_json,
            },
          ],
        };
      }

      const modelName = process.env.AI_IMAGE_MODEL || params.model;
      return realOpenAI.images.generate({
        ...params,
        model: modelName,
      });
    },

    edit: async (params: any): Promise<any> => {
      if (provider === "google") {
        throw new Error("Google Imagen 3 does not support local image masking via the developer REST API.");
      }

      const modelName = process.env.AI_IMAGE_MODEL || params.model;
      return realOpenAI.images.edit({
        ...params,
        model: modelName,
      });
    },
  },

  audio: {
    transcriptions: {
      create: async (params: any): Promise<any> => {
        if (provider === "google") {
          console.warn("Audio transcription is not supported natively via Google Gen AI. Falling back to OpenAI.");
        }
        return realOpenAI.audio.transcriptions.create(params);
      },
    },
  },
};
