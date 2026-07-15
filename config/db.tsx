import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

type Db = ReturnType<typeof drizzle>;

let dbInstance: Db | null = null;

export function getDb() {
    if (!dbInstance) {
        const databaseUrl = process.env.DATABASE_URL;

        if (!databaseUrl) {
            throw new Error('DATABASE_URL environment variable is not set');
        }

        dbInstance = drizzle({ client: neon(databaseUrl) });
    }

    return dbInstance;
}
