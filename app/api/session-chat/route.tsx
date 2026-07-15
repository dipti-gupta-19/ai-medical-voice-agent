import { db } from "@/config/db";
import { SessionChartTable, usersTable } from "@/config/schema";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';
import { desc, eq } from "drizzle-orm";

async function ensureUserExists(user: Awaited<ReturnType<typeof currentUser>>) {
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) {
        return null;
    }

    const existingUsers = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

    if (existingUsers.length === 0) {
        await db.insert(usersTable).values({
            name: user?.fullName ?? "User",
            email,
            credits: 10,
        });
    }

    return email;
}

export async function POST(req: NextRequest) {
    const { notes, selectedDoctor } = await req.json();
    const user = await currentUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const email = await ensureUserExists(user);
        if (!email) {
            return NextResponse.json({ error: "User email not found" }, { status: 400 });
        }

        const sessionId = uuidv4();
        const result = await db.insert(SessionChartTable).values({
            sessionId,
            createdBy: email,
            notes,
            selectedDoctor,
            createdOn: new Date().toISOString(),
        }).returning();

        return NextResponse.json(result[0]);
    } catch (e) {
        console.error("session-chat POST error:", e);
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId')
    const user = await currentUser();

    if (sessionId == 'all') {
        const result = await db.select().from(SessionChartTable)
            //@ts-ignore
            .where(eq(SessionChartTable.createdBy,user?.primaryEmailAddress?.emailAddress))
            .orderBy(desc(SessionChartTable.id));

        return NextResponse.json(result)
    } else {
        const result = await db.select().from(SessionChartTable)
            //@ts-ignore
            .where(eq(SessionChartTable.sessionId, sessionId));

        return NextResponse.json(result[0])
    }

}