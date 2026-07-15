import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/config/OpenAiModel";
import { AIDoctorAgents } from "@/shared/list";
import { doctorAgent } from "@/app/(routes)/dashboard/_components/DoctorAgentCard";

export const dynamic = "force-dynamic";

const SUGGEST_DOCTORS_PROMPT = `You are a medical triage assistant. Given a list of available AI doctor agents and user symptoms, suggest the most relevant doctors.

Available doctors (use their exact id values in your response):
${JSON.stringify(AIDoctorAgents.map(({ id, specialist, description }) => ({ id, specialist, description })))}

Return ONLY valid JSON in this exact format:
{"suggestedDoctors": [1, 2, 3]}

Rules:
- suggestedDoctors must be an array of doctor id numbers from the list above
- suggest 1 to 3 most relevant doctors
- do not include any other keys or text`;

function parseJsonFromModel(content: string) {
    const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(cleaned);
}

function normalizeSuggestedDoctors(parsed: unknown): doctorAgent[] {
    const payload = parsed as Record<string, unknown>;
    const rawList =
        payload.suggestedDoctors ??
        payload.doctors ??
        (Array.isArray(parsed) ? parsed : []);

    if (!Array.isArray(rawList)) {
        return [];
    }

    const doctors = rawList
        .map((item) => {
            if (typeof item === "number") {
                return AIDoctorAgents.find((doctor) => doctor.id === item);
            }

            if (typeof item === "object" && item !== null) {
                const candidate = item as Partial<doctorAgent>;
                if (candidate.id) {
                    return AIDoctorAgents.find((doctor) => doctor.id === candidate.id) ?? candidate;
                }
                if (candidate.specialist) {
                    return AIDoctorAgents.find(
                        (doctor) => doctor.specialist.toLowerCase() === candidate.specialist!.toLowerCase()
                    );
                }
            }

            if (typeof item === "string") {
                return AIDoctorAgents.find(
                    (doctor) => doctor.specialist.toLowerCase() === item.toLowerCase()
                );
            }

            return undefined;
        })
        .filter((doctor): doctor is doctorAgent => Boolean(doctor));

    return doctors.slice(0, 3);
}

export async function POST(req: NextRequest) {
    const { notes } = await req.json();

    if (!notes?.trim()) {
        return NextResponse.json({ error: "Notes are required" }, { status: 400 });
    }

    try {
        const completion = await getOpenAI().chat.completions.create({
            model: "openrouter/free",
            messages: [
                { role: "system", content: SUGGEST_DOCTORS_PROMPT },
                {
                    role: "user",
                    content: `User Notes/Symptoms: ${notes}. Suggest the most relevant doctors.`,
                },
            ],
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error("Empty response from AI model");
        }

        const parsed = parseJsonFromModel(content);
        const doctors = normalizeSuggestedDoctors(parsed);

        if (doctors.length === 0) {
            return NextResponse.json({
                doctors: [AIDoctorAgents[0]],
                suggestedDoctors: [AIDoctorAgents[0]],
            });
        }

        return NextResponse.json({ doctors, suggestedDoctors: doctors });
    } catch (e) {
        console.error("suggest-doctors error:", e);
        return NextResponse.json(
            {
                doctors: [AIDoctorAgents[0]],
                suggestedDoctors: [AIDoctorAgents[0]],
                error: "Failed to suggest doctors, showing default option",
            },
            { status: 200 }
        );
    }
}