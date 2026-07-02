---
name: Drizzle-kit interactive push in sandbox
description: drizzle-kit push CLI prompts (rename vs create table) fail when piped in this sandbox; use direct SQL for new tables instead.
---

When adding a brand-new Drizzle table to an existing schema, `drizzle-kit push` may detect
column/table similarity to an existing table and prompt interactively ("rename table X to Y?"
vs "create table"). This prompt could not be reliably answered via bash piping (`yes`, `printf`,
heredocs) in this sandbox — the process hangs or mis-answers.

**Why:** The interactive prompt requires a real TTY-style interaction that the sandboxed shell
tool does not provide, and non-interactive flags for this prompt aren't exposed by drizzle-kit.

**How to apply:** For simple additive changes (new table, matches Drizzle schema exactly), skip
`drizzle-kit push` and instead run the equivalent `CREATE TABLE ...` SQL directly via the
`executeSql` code-execution tool. Make sure the SQL matches the Drizzle schema definition
(column names, types, defaults) exactly so future `drizzle-kit push`/`generate` runs see no diff.
