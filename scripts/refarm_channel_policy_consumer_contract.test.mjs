import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

test("the root pins @refarm.dev/channel-policy-v1 via the local tarball", () => {
  const pkg = readJson("package.json");
  expect(pkg.dependencies?.["@refarm.dev/channel-policy-v1"]).toBe("file:vendor/refarm.dev-channel-policy-v1-0.1.0.tgz");
});

test("the consumed @refarm.dev/channel-policy-v1 surface is exported", () => {
  const dts = readFileSync(
    join(ROOT, "node_modules/@refarm.dev/channel-policy-v1/dist/index.d.ts"),
    "utf8",
  );
  for (const name of [
    "CHANNEL_DELIVERY_ENVELOPE_SCHEMA",
    "buildChannelIdempotencyKey",
    "validateChannelDeliveryEnvelope",
    "isChannelDeliveryEnvelope",
  ]) {
    expect(dts, `missing ${name}`).toMatch(new RegExp(`export declare (const|function) ${name}\\b`));
  }
});
