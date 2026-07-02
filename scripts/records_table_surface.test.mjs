import { test, expect } from "vitest";
import { recordsToTable, buildRecordsTable } from "./generate_records_data.mjs";

// A table/list surface is a VIEW over records:v1 — the same model the graph views. A record with
// fields is a row; any records become rows. Config-driven columns, exactly like the graph.

const RECORDS = [
  {
    id: "20 - Projetos/a",
    "@type": ["KnowledgeRecord", "Project"],
    fields: { title: "Alpha", status: "published", tags: ["x"], folder: "20 - Projetos" },
    relations: [{ type: "links", target: "30 - Áreas/b" }],
  },
  {
    id: "fontes/feed",
    "@type": ["KnowledgeRecord", "Source"],
    fields: { title: "A Feed", status: null, sourceKind: "feed", folder: "fontes" },
    relations: [],
  },
];

test("recordsToTable projects records to config-driven columns", () => {
  const { columns, rows } = recordsToTable(RECORDS, { columns: ["title", "status"] });
  expect(columns).toEqual(["title", "status"]);
  const alpha = rows.find((r) => r.id === "20 - Projetos/a");
  expect(alpha).toMatchObject({ type: "Project", relations: 1 });
  expect(alpha.cells).toEqual({ title: "Alpha", status: "published" });
  // a column a record lacks resolves to null, not undefined
  const feed = rows.find((r) => r.id === "fontes/feed");
  expect(feed.cells.status).toBeNull();
  expect(feed.type).toBe("Source");
});

test("recordsToTable derives columns from field keys when none configured", () => {
  const { columns } = recordsToTable(RECORDS);
  expect(columns).toEqual(expect.arrayContaining(["title", "status", "tags", "folder", "sourceKind"]));
});

test("buildRecordsTable builds the surface from notes via records:v1 (config surface)", () => {
  const notes = [{ id: "20 - Projetos/a", title: "Alpha", folder: "20 - Projetos", status: "published", tags: ["x"], links: [] }];
  const config = {
    typeByFolder: { "20 - Projetos": "Project" },
    serialization: { fieldsFromFrontmatter: ["title", "status", "tags"], preserveFolderAs: "folder" },
    surface: { table: { columns: ["title", "status"] } },
  };
  const { columns, rows } = buildRecordsTable(notes, config);
  expect(columns).toEqual(["title", "status"]);
  expect(rows[0]).toMatchObject({ id: "20 - Projetos/a", type: "Project" });
  expect(rows[0].cells).toEqual({ title: "Alpha", status: "published" });
});
