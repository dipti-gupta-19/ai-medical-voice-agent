import { db } from "@/config/db";
import { SessionChartTable } from "@/config/schema";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';
import { desc, eq } from "drizzle-orm";
export async function POST(req: NextRequest) {
    const { notes, selectedDoctor } = await req.json();
    const user = await currentUser();
    try {
        const sessionId = uuidv4();
        const result = await db.insert(SessionChartTable).values({
            sessionId: sessionId,
            createdBy: user?.primaryEmailAddress?.emailAddress,
            notes: notes,
            selectedDoctor: selectedDoctor,
            createdOn: (new Date()).toString(),

            //@ts-ignore
        }).returning({ SessionChartTable })
        return NextResponse.json(result[0]?.SessionChartTable)
    } catch (e) {
        return NextResponse.json(e)
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