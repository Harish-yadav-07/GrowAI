// src/inngest/client.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
    id: "growai",
    name: "GrowAI",
    credentials: {
        gemini: {
            apiKey: process.env.GEMINI_API_KEY,
        },
    },
});