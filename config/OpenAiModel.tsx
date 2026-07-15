import OpenAI from "openai";

let openaiInstance: OpenAI | null = null;

export function getOpenAI() {
    if (!openaiInstance) {
        openaiInstance = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPEN_ROUTER_API_KEY,
        });
    }

    return openaiInstance;
}
