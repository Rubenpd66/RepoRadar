import "dotenv/config";
import { db } from "../src/lib/db";
// Expired demo identities cannot authenticate again; never touch OAuth users or seed.
const cutoff = new Date(Date.now() - 2 * 86400000);
try {
  const result = await db.user.deleteMany({
    where: {
      demo: true,
      id: { startsWith: "demo-" },
      createdAt: { lt: cutoff },
    },
  });
  console.log(`Sesiones demo caducadas eliminadas: ${result.count}`);
} finally {
  await db.$disconnect();
}
