import { Database } from 'bun:sqlite';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { BunSQLiteDatabase, drizzle } from 'drizzle-orm/bun-sqlite';
import { DB_PATH, DRIZZLE_PATH } from '../helpers/paths';
import { categories, spaces } from './schema';
import { seedDatabase } from './seed';

let db: BunSQLiteDatabase;
const DEFAULT_SPACE_CATEGORIES = ['Текстовые каналы', 'Голосовые каналы'] as const;

const ensureDefaultSpaceCategories = async () => {
  const now = Date.now();
  const allSpaces = await db.select({ id: spaces.id }).from(spaces);
  const existingCategories = await db
    .select({
      spaceId: categories.spaceId,
      name: categories.name,
      position: categories.position
    })
    .from(categories);

  const categoriesBySpace = new Map<
    number,
    { names: Set<string>; maxPosition: number }
  >();

  for (const category of existingCategories) {
    if (!category.spaceId) continue;

    const current = categoriesBySpace.get(category.spaceId) ?? {
      names: new Set<string>(),
      maxPosition: 0
    };

    current.names.add(category.name);
    current.maxPosition = Math.max(current.maxPosition, category.position);
    categoriesBySpace.set(category.spaceId, current);
  }

  for (const space of allSpaces) {
    const current = categoriesBySpace.get(space.id) ?? {
      names: new Set<string>(),
      maxPosition: 0
    };

    const missingCategories = DEFAULT_SPACE_CATEGORIES.filter(
      (name) => !current.names.has(name)
    ).map((name, index) => ({
      name,
      position: current.maxPosition + index + 1,
      spaceId: space.id,
      createdAt: now
    }));

    if (missingCategories.length === 0) continue;

    await db.insert(categories).values(missingCategories);
  }
};

const loadDb = async () => {
  const sqlite = new Database(DB_PATH, { create: true, strict: true });

  sqlite.run('PRAGMA foreign_keys = ON;');

  db = drizzle({ client: sqlite });

  await migrate(db, { migrationsFolder: DRIZZLE_PATH });
  await seedDatabase();
  await ensureDefaultSpaceCategories();
};

export { db, loadDb };
