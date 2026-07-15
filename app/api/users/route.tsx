import { getDb } from "@/config/db";
import { usersTable } from "@/config/schema";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req:NextRequest) {
    const user=await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;

    if (!email) {
        return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }
    
    try{
        const db = getDb();
        const users=await db.select().from(usersTable)
        .where(eq(usersTable.email, email))
        
        if(users?.length==0){
            const result=await db.insert(usersTable).values({
                name:user?.fullName ?? "User",
                email,
                credits:10
            }).returning()
            return NextResponse.json(result[0])
        }
        return NextResponse.json(users[0]);

    }catch(e){
        console.error("users POST error:", e);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}