// A generic key-lookup enrichment:v1 provider. For each record it reads a KEY from a configured field,
// resolves it via an injected `lookup(key)` → fields-to-add (or null), and proposes enrichment changes.
// The lookup is the seam: a fixture map for tests/reference, a real resolver downstream (the record's
// domain — e.g. an external registry — stays out of vault-seed). This is the "enrichment real" the ETL
// needs, kept generic: any consumer supplies its own key field + lookup.
import { createHash } from "node:crypto";

function hashValue(value) {
  return createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex").slice(0, 16);
}

/**
 * @param {object} opts
 * @param {string} opts.keyField                 field on the record whose value is the lookup key
 * @param {(key: string) => (Record<string, unknown> | null | Promise<Record<string, unknown> | null>)} opts.lookup
 * @param {string} [opts.providerId]
 * @returns {import("@refarm.dev/enrichment-contract-v1").EnrichmentProvider}
 */
export function createKeyLookupEnrichmentProvider({
  keyField,
  lookup,
  providerId = "key-lookup",
  // Provenance timestamp, fixed at provider creation so identical inputs yield identical changes
  // (enrichment:v1 requires dry-run and apply to be idempotent). Inject for full determinism.
  at = new Date().toISOString(),
}) {
  if (!keyField || typeof lookup !== "function") {
    throw new Error("createKeyLookupEnrichmentProvider requires { keyField, lookup }");
  }
  return {
    pluginId: providerId,
    capability: "enrichment:v1",

    describe() {
      // addsFields is dynamic (depends on the lookup); declared empty, discovered at enrich time.
      return { providerId, needsKeyFrom: [keyField], addsFields: [] };
    },

    select(inputs) {
      return inputs.filter((input) => input?.fields?.[keyField] != null && input.fields[keyField] !== "");
    },

    async enrich(inputs, options = {}) {
      const mode = options.mode ?? "dry-run";
      const records = [];
      let enriched = 0;
      let skipped = 0;
      const byCode = {};
      const skip = (id, code) => {
        byCode[code] = (byCode[code] ?? 0) + 1;
        skipped += 1;
        records.push({ id, changes: [], skipped: { code } });
      };

      for (const input of inputs) {
        const rawKey = input?.fields?.[keyField];
        if (rawKey == null || rawKey === "") {
          skip(input.id, "NO_KEY");
          continue;
        }
        const key = String(rawKey);

        let resolved;
        try {
          resolved = await lookup(key);
        } catch {
          skip(input.id, "UNAVAILABLE");
          continue;
        }
        if (!resolved || typeof resolved !== "object" || Object.keys(resolved).length === 0) {
          skip(input.id, "NO_MATCH");
          continue;
        }

        const changes = Object.entries(resolved).map(([field, after]) => ({
          field,
          before: input.fields?.[field] ?? null,
          after,
          provenance: {
            providerId,
            key,
            sourceRef: input.sourceRef,
            hash: hashValue(after),
            at,
          },
        }));
        records.push({ id: input.id, changes });
        enriched += 1;
      }

      return { mode, records, diagnostics: { total: inputs.length, enriched, skipped, byCode } };
    },
  };
}
