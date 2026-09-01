import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, describe, it } from "node:test";

import { buildUnisonConfig, readConfig } from "../src/utils/config.js";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "accordance-test-"));

after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

const writeConfig = function (name: string, content: string) {
    const configPath = path.join(tmpDir, name);
    fs.writeFileSync(configPath, content);
    return configPath;
};

describe("readConfig", () => {
    it("loads the documented example config", () => {
        const config = readConfig(
            path.join(import.meta.dirname, "..", "config.example.yml"),
        );
        assert.equal(config.name, "projects");
        assert.ok(config.syncIgnore?.includes("Name node_modules"));
        assert.deepEqual(config.options, {
            auto: true,
            batch: true,
            confirmbigdel: true,
        });
    });

    it("resolves merge keys so shared ignore rules survive", () => {
        const configPath = writeConfig(
            "merge.yml",
            [
                "defaults: &defaults",
                "  syncIgnore:",
                "    - Name .env",
                "    - Name .git",
                "",
                "name: merged",
                "local:",
                "  root: ~/Projects/",
                "remote:",
                "  username: someone",
                "  host: example.com",
                "  root: ~/Projects/",
                "prefer: local",
                "<<: *defaults",
                "",
            ].join("\n"),
        );
        const config = readConfig(configPath);
        assert.deepEqual(config.syncIgnore, ["Name .env", "Name .git"]);
        const unisonConfig = buildUnisonConfig(config);
        assert.ok(unisonConfig.includes("ignore = Name .env"));
        assert.ok(unisonConfig.includes("ignore = Name .git"));
    });

    it("reports missing fields for an empty config file", () => {
        const configPath = writeConfig("empty.yml", "\n# nothing here\n");
        assert.throws(() => readConfig(configPath), /Invalid value undefined/);
    });

    it("rejects a multi-document config file", () => {
        const configPath = writeConfig("multi.yml", "name: a\n---\nname: b\n");
        assert.throws(() => readConfig(configPath), /single YAML document/);
    });
});
