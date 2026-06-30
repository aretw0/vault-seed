import test from "node:test";
import assert from "node:assert/strict";
import * as recordsMod from "@refarm.dev/records-contract-v1";
import { noteToRecord, buildRecordsFromNotes } from "./generate_records_data.mjs";

const NOTES = [
  { id: "20-projects/launch", title: "Launch", folder: "20 - Projects", status: "active", tags: ["p"], links: ["30-areas/ops"] },
  { id: "30-areas/ops", title: "Ops", folder: "30 - Areas", status: "evergreen", tags: [], links: [] },
];

test("noteToRecord maps PARA folder to @type and links to relations", () => {
  const r = noteToRecord(NOTES[0]);
  assert.equal(r["@type"], "Project");
  assert.equal(r.fields.title, "Launch");
  assert.deepEqual(r.relations, [{ type: "links", target: "30-areas/ops" }]);
  assert.deepEqual(r.sourceRefs, ["vault:20-projects/launch"]);
});

test("buildRecordsFromNotes degrades gracefully without records:v1", async () => {
  const out = await buildRecordsFromNotes(NOTES, { recordsMod: null });
  assert.equal(out.degraded, true);
  assert.equal(out.records.length, 2);
  assert.equal(out.manifest, null);
});

test("buildRecordsFromNotes builds + validates a records:v1 manifest from notes", async () => {
  const out = await buildRecordsFromNotes(NOTES, { recordsMod });
  assert.equal(out.degraded, false);
  assert.equal(out.validation.ok, true, JSON.stringify(out.validation));
  assert.equal(out.manifest.records.length, 2);
  assert.ok(out.manifest.records[0].contentHash, "records are stamped with a content hash");
});
