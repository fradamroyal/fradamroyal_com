"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { createServer } = require("node:http");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const BUILD_SCRIPT = resolve(__dirname, "..", "build.sh");
const HUGO_URL = "https://github.com/gohugoio/hugo/releases/download/v0.165.0/hugo_0.165.0_linux-amd64.tar.gz";

function siteBuild(events) {
  return events.find((event) => event.startsWith("hugo ") && !event.startsWith("hugo version "));
}

function assertNoBuild(events) {
  assert.equal(siteBuild(events), undefined, "The site must not build after a prerequisite fails.");
}

function executable(directory, name, source) {
  writeFileSync(join(directory, name), `#!/usr/bin/env bash\nset -euo pipefail\n${source}\n`, { mode: 0o755 });
}

function toolPath(name) {
  const result = spawnSync("sh", ["-c", `command -v ${name}`], { encoding: "utf8" });
  assert.equal(result.status, 0, `${name} is required to test the build script.`);
  return result.stdout.trim();
}

async function fixture(t, options = {}) {
  const root = mkdtempSync(join(tmpdir(), "fradamroyal-build-script-"));
  const bin = join(root, "bin");
  const work = join(root, "work");
  const temporary = join(root, "temporary");
  const archiveRoot = join(root, "archive");
  const eventsPath = join(root, "events");
  for (const directory of [bin, work, temporary, archiveRoot]) mkdirSync(directory);
  writeFileSync(eventsPath, "");

  executable(archiveRoot, "hugo", `
printf '%s\\n' "hugo $* TZ=$TZ executable=$0" >> "$FIXTURE_EVENTS"
if [ "\${1:-}" = version ]; then
  exit "$FIXTURE_VERSION_STATUS"
fi
exit "$FIXTURE_BUILD_STATUS"`);
  const archivePath = join(root, "hugo.tar.gz");
  const archive = spawnSync(toolPath("tar"), ["-czf", archivePath, "-C", archiveRoot, "hugo"], { encoding: "utf8" });
  assert.equal(archive.status, 0, archive.stderr);
  const body = options.badArchive ? Buffer.from("This is not a gzip archive.") : readFileSync(archivePath);
  let requests = 0;
  const server = createServer((request, response) => {
    requests += 1;
    assert.equal(request.url, "/hugo.tar.gz");
    response.writeHead(options.httpStatus || 200);
    response.end(body);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  });

  // Redirect only the expected release URL; all transfer/error handling uses real curl.
  executable(bin, "curl", `
printf '%s\\n' "curl $*" >> "$FIXTURE_EVENTS"
args=()
for argument in "$@"; do
  if [ "$argument" = "$FIXTURE_HUGO_URL" ]; then
    args+=("$FIXTURE_URL")
  elif [[ "$argument" = http* ]]; then
    echo "Unexpected network destination: $argument" >&2
    exit 99
  else
    args+=("$argument")
  fi
done
exec "$FIXTURE_REAL_CURL" --disable "\${args[@]}"`);
  executable(bin, "tar", `
printf '%s\\n' "tar $*" >> "$FIXTURE_EVENTS"
exec "$FIXTURE_REAL_TAR" "$@"`);
  executable(bin, "git", `
printf '%s\\n' "git $*" >> "$FIXTURE_EVENTS"
case "\${1:-}" in
  config) exit 0 ;;
  rev-parse)
    printf '%s\\n' "$FIXTURE_SHALLOW"
    exit "$FIXTURE_GIT_STATUS"
    ;;
  fetch) exit "$FIXTURE_FETCH_STATUS" ;;
  *) exit 99 ;;
esac`);

  const env = {
    PATH: `${bin}:${process.env.PATH}`,
    TMPDIR: temporary,
    FIXTURE_EVENTS: eventsPath,
    FIXTURE_HUGO_URL: HUGO_URL,
    FIXTURE_URL: `http://127.0.0.1:${server.address().port}/hugo.tar.gz`,
    FIXTURE_REAL_CURL: toolPath("curl"),
    FIXTURE_REAL_TAR: toolPath("tar"),
    FIXTURE_SHALLOW: String(options.shallow || false),
    FIXTURE_GIT_STATUS: String(options.gitStatus || 0),
    FIXTURE_FETCH_STATUS: String(options.fetchStatus || 0),
    FIXTURE_VERSION_STATUS: String(options.versionStatus || 0),
    FIXTURE_BUILD_STATUS: String(options.buildStatus || 0),
  };

  return {
    events: () => readFileSync(eventsPath, "utf8").trim().split("\n"),
    requests: () => requests,
    async run() {
      // No HOME or home installation directory is supplied to the isolated build.
      const child = spawn("bash", [BUILD_SCRIPT], { cwd: work, env, timeout: 10000 });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (data) => { stdout += data; });
      child.stderr.on("data", (data) => { stderr += data; });
      const status = await new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("close", resolve);
      });
      assert.deepEqual(readdirSync(temporary), [], "Temporary installation must be cleaned up.");
      assert.deepEqual(readdirSync(work), [], "Downloads must not remain in the checkout.");
      assert.equal(existsSync(join(root, ".local")), false);
      return { status, stdout, stderr };
    },
  };
}

test("build bootstraps only Hugo and preserves production flags, timezone, and full Git history", async (t) => {
  const build = await fixture(t);
  const result = await build.run();
  assert.equal(result.status, 0, result.stderr);
  const events = build.events();
  const downloads = events.filter((event) => event.startsWith("curl "));
  assert.ok(downloads.length > 0);
  assert.ok(downloads.every((event) => event.includes(HUGO_URL)), "Only Hugo needs downloading.");
  assert.ok(events.some((event) => event.startsWith("hugo version ")));
  assert.ok(events.includes("git config core.quotepath false"));
  assert.ok(events.includes("git rev-parse --is-shallow-repository"));
  assert.equal(events.some((event) => event.startsWith("git fetch ")), false);
  const invocation = siteBuild(events);
  assert.ok(invocation, "The site must build after successful setup.");
  for (const argument of ["--gc", "--minify", "--buildFuture", "TZ=America/Chicago"]) {
    assert.ok(invocation.split(" ").includes(argument), `Missing ${argument}.`);
  }
  assert.match(invocation, /executable=\/.+\/hugo$/);
});

test("repeated builds use fresh installations without home installation directories", async (t) => {
  const build = await fixture(t);
  assert.equal((await build.run()).status, 0);
  assert.equal((await build.run()).status, 0);
  const versions = build.events().filter((event) => event.startsWith("hugo version "));
  const executables = new Set(versions.map((event) => event.split("executable=")[1]));
  assert.ok(executables.size >= 2, "Repeated builds must use distinct temporary installations.");
});

test("an HTTP error fails before archive extraction or building", async (t) => {
  const build = await fixture(t, { httpStatus: 404 });
  const result = await build.run();
  assert.equal(result.status, 22, result.stderr);
  assert.match(result.stderr, /404/);
  assert.ok(build.requests() > 0);
  const events = build.events();
  assert.equal(events.some((event) => /^(tar|git|hugo) /.test(event)), false);
});

test("an invalid archive fails before verification, Git changes, or building", async (t) => {
  const build = await fixture(t, { badArchive: true });
  const result = await build.run();
  assert.notEqual(result.status, 0);
  const events = build.events();
  assert.ok(events.some((event) => event.startsWith("tar ")));
  assert.equal(events.some((event) => /^(git|hugo) /.test(event)), false);
});

test("a failed Hugo version command stops before Git changes or building", async (t) => {
  const build = await fixture(t, { versionStatus: 17 });
  const result = await build.run();
  assert.equal(result.status, 17);
  const events = build.events();
  assert.ok(events.some((event) => event.startsWith("hugo version ")));
  assert.equal(events.some((event) => event.startsWith("git ")), false);
  assertNoBuild(events);
});

test("a shallow checkout fetches complete history before the site build", async (t) => {
  const build = await fixture(t, { shallow: true });
  const result = await build.run();
  assert.equal(result.status, 0, result.stderr);
  const events = build.events();
  const fetchIndex = events.indexOf("git fetch --unshallow");
  const buildIndex = events.indexOf(siteBuild(events));
  assert.ok(fetchIndex >= 0, "A shallow checkout must fetch complete history.");
  assert.ok(buildIndex > fetchIndex, "Fetching history must finish before building.");
});

test("a failed history fetch stops before building", async (t) => {
  const build = await fixture(t, { shallow: true, fetchStatus: 18 });
  const result = await build.run();
  assert.equal(result.status, 18);
  const events = build.events();
  assert.ok(events.includes("git fetch --unshallow"));
  assertNoBuild(events);
});

test("a failed Git history check stops before building", async (t) => {
  const build = await fixture(t, { gitStatus: 19 });
  const result = await build.run();
  assert.equal(result.status, 19);
  const events = build.events();
  assert.ok(events.includes("git rev-parse --is-shallow-repository"));
  assert.equal(events.some((event) => event.startsWith("git fetch ")), false);
  assertNoBuild(events);
});

test("a failed site build preserves its failure status and cleans up", async (t) => {
  const build = await fixture(t, { buildStatus: 20 });
  const result = await build.run();
  assert.equal(result.status, 20);
  assert.ok(siteBuild(build.events()));
});
