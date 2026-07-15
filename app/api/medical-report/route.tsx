import { getDb } from "@/config/db";
import { getOpenAI } from "@/config/OpenAiModel";
import { SessionChartTable } from "@/config/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const REPORT_GEN_PROMPT = `You are an AI Medical Voice Agent that just finished a voice conversation with a user. Based on doctor AI agent Info and conversation between AI medical agent and user, generate a structured report with the following fields:
1. sessionId: a unique session identifier
2. agent: the medical specialist name (e.g., "General Physician AI")
3. user: name of the patient or "Anonymous" if not provided
4. timestamp: current date and time in ISO format
5. chiefComplaint: one-sentence summary of the main health concern
6. summary: a detailed 3-5 sentence summary of the conversation, symptoms, and recommendations
7. symptoms: list of symptoms mentioned by the user
8. duration: how long the user has experienced the symptoms
9. severity: mild, moderate, or severe
10. medicationsMentioned: list of any medicines mentioned
11. recommendations: list of AI suggestions (e.g., rest, see a doctor)
12. precautions: list of precautions the patient should take

Return the result in this JSON format:

{
  "sessionId": "string",
  "agent": "string",
  "user": "string",
  "timestamp": "ISO Date string",
  "chiefComplaint": "string",
  "summary": "string",
  "symptoms": ["symptom1", "symptom2"],
  "duration": "string",
  "severity": "string",
  "medicationsMentioned": ["med1", "med2"],
  "recommendations": ["rec1", "rec2"],
  "precautions": ["precaution1", "precaution2"]
}

Only include valid fields. Respond with nothing else.`;

type ConversationMessage = {
    role: string;
    text: string;
};

function parseJsonFromContent(content: string) {
    const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
        throw new Error("Invalid JSON from model");
    }
}

function buildFallbackReport(
    sessionId: string,
    sessionDetail: Record<string, unknown> | undefined,
    messages: ConversationMessage[]
) {
    const selectedDoctor = sessionDetail?.selectedDoctor as { specialist?: string } | undefined;
    const userMessages = messages
        .filter((message) => message.role === "user")
        .map((message) => message.text);
    const assistantMessages = messages
        .filter((message) => message.role === "assistant")
        .map((message) => message.text);

    const notes = typeof sessionDetail?.notes === "string" ? sessionDetail.notes : "";
    const conversationSummary = [...userMessages, ...assistantMessages].join(" ").trim();

    return {
        sessionId,
        agent: selectedDoctor?.specialist ?? "AI Medical Agent",
        user: "Anonymous",
        timestamp: new Date().toISOString(),
        chiefComplaint: notes || userMessages[0] || "General consultation",
        summary:
            conversationSummary.slice(0, 800) ||
            "Consultation completed. A detailed AI summary could not be generated, but the conversation was saved.",
        symptoms: userMessages.slice(0, 5),
        duration: "Not specified",
        severity: "Not specified",
        medicationsMentioned: [],
        recommendations: [
            "Review the saved conversation for full details",
            "Consult a healthcare provider if symptoms persist or worsen",
        ],
        precautions: ["Follow medical advice and monitor your symptoms closely"],
    };
}

export async function POST(req: NextRequest) {
    const { sessionId, sessionDetail, messages } = await req.json();

    if (!sessionId) {
        return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const conversationMessages: ConversationMessage[] = Array.isArray(messages) && messages.length > 0
        ? messages
        : typeof sessionDetail?.notes === "string" && sessionDetail.notes.trim()
            ? [{ role: "user", text: sessionDetail.notes.trim() }]
            : [];

    if (conversationMessages.length === 0) {
        return NextResponse.json({ error: "Conversation messages are required" }, { status: 400 });
    }

    try {
        const db = getDb();

        let report = buildFallbackReport(sessionId, sessionDetail, conversationMessages);

        await db
            .update(SessionChartTable)
            .set({
                conversation: conversationMessages,
                report,
            })
            .where(eq(SessionChartTable.sessionId, sessionId));

        const userInput = `AI Doctor Agent Info: ${JSON.stringify(sessionDetail)}, Conversation: ${JSON.stringify(conversationMessages)}`;

        try {
            const completion = await getOpenAI().chat.completions.create({
                model: "openrouter/free",
                messages: [
                    { role: "system", content: REPORT_GEN_PROMPT },
                    { role: "user", content: userInput },
                ],
            });

            const content = completion.choices[0]?.message?.content?.trim() ?? "";
            if (content) {
                const parsed = parseJsonFromContent(content);
                report = {
                    ...report,
                    ...parsed,
                    sessionId,
                    timestamp: parsed.timestamp ?? new Date().toISOString(),
                };
            }
        } catch (aiError) {
            console.error("medical-report AI error:", aiError);
        }

        await db
            .update(SessionChartTable)
            .set({
                report,
                conversation: conversationMessages,
            })
            .where(eq(SessionChartTable.sessionId, sessionId));

        return NextResponse.json(report);
    } catch (e) {
        console.error("medical-report error:", e);
        return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
    }
}
