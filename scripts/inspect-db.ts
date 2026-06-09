import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("Schemas:");
  const schemas = await sql`
    select schema_name
    from information_schema.schemata
    where schema_name not in ('pg_catalog', 'information_schema', 'pg_toast')
    order by schema_name
  `;
  for (const s of schemas) console.log(`  ${s.schema_name}`);

  console.log("\nTables (excl. public):");
  const tables = await sql`
    select table_schema, table_name
    from information_schema.tables
    where table_schema not in ('pg_catalog', 'information_schema', 'pg_toast', 'public')
    order by table_schema, table_name
  `;
  if (tables.length === 0) console.log("  (none)");
  for (const t of tables) console.log(`  ${t.table_schema}.${t.table_name}`);

  console.log("\nTables (public):");
  const pubTables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `;
  for (const t of pubTables) console.log(`  public.${t.table_name}`);

  // If a neon_auth schema or similar exists, dump column shape of its user table.
  const authSchemas = ["neon_auth", "neon", "auth"];
  for (const s of authSchemas) {
    const cols = await sql`
      select table_name, column_name, data_type
      from information_schema.columns
      where table_schema = ${s}
      order by table_name, ordinal_position
    `;
    if (cols.length > 0) {
      console.log(`\nColumns in ${s}.*:`);
      let last = "";
      for (const c of cols) {
        if (c.table_name !== last) {
          console.log(`  ${s}.${c.table_name}`);
          last = c.table_name;
        }
        console.log(`    - ${c.column_name} (${c.data_type})`);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
