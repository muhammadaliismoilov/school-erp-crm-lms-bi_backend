# Legacy migrations (archived)

These 11 migrations were authored against a `synchronize`-created schema and
only contained incremental `ALTER`/`Improve` statements — none of them created
the base tables they depended on. As a result they could **not** run on a fresh
database (the first one failed with `relation "quarters" does not exist`).

They have been fully superseded by the single generated baseline
`src/database/migrations/1780000000000-InitialSchema.ts`, which reflects the
complete current entity schema (115 tables, all indexes and FKs) and runs clean
on an empty database.

Kept here for historical reference only. They are intentionally outside `src/`
so they are not compiled or picked up by the TypeORM migrations glob.
