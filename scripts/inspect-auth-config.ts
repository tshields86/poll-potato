import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const rows = await sql`select * from neon_auth.project_config`;
  for (const r of rows) {
    console.log("Neon Auth project config:");
    for (const [k, v] of Object.entries(r)) {
      console.log(`  ${k}:`, JSON.stringify(v));
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
