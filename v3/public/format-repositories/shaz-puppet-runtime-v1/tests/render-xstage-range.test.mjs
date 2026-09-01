import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PassThrough, Writable } from "node:stream";
import test from "node:test";

import { renderFrameRange } from "../runtime/render-xstage-range.mjs";

function createFfmpegStub({ exitCode = 0, spawnError = null, stderr = "" } = {}) {
  const calls = [];
  const chunks = [];
  let child = null;
  const spawnProcess = (program, args, options) => {
    child = new EventEmitter();
    child.exitCode = null;
    child.killed = false;
    child.signalCode = null;
    child.stderr = new PassThrough();
    child.stdin = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
      final(callback) {
        callback();
        queueMicrotask(() => {
          if (stderr) child.stderr.write(stderr);
          child.stderr.end();
          child.exitCode = exitCode;
          child.emit("close", exitCode, null);
        });
      },
    });
    child.kill = () => {
      if (child.exitCode !== null || child.signalCode !== null) return false;
      child.killed = true;
      child.signalCode = "SIGTERM";
      queueMicrotask(() => child.emit("close", null, child.signalCode));
      return true;
    };
    calls.push({ program, args, options });
    if (spawnError) queueMicrotask(() => child.emit("error", spawnError));
    return child;
  };
  return {
    calls,
    chunks,
    get child() {
      return child;
    },
    spawnProcess,
  };
}

function createFileSystemStub() {
  const renames = [];
  const removals = [];
  return {
    renames,
    removals,
    fileSystem: {
      rename: async (source, destination) => {
        renames.push({ source, destination });
      },
      rm: async (target, options) => {
        removals.push({ target, options });
      },
    },
  };
}

test("range frames stream to ffmpeg in order without frame scratch files", async () => {
  const ffmpeg = createFfmpegStub();
  const files = createFileSystemStub();
  const renderedFrames = [];
  const receipts = await renderFrameRange({
    start: 17,
    end: 19,
    fps: 24,
    output: "/output/clip.mp4",
    renderFrame: async (frame) => {
      renderedFrames.push(frame);
      return {
        buffer: Buffer.from(`png-${frame}|`),
        receipt: { frame },
      };
    },
    spawnProcess: ffmpeg.spawnProcess,
    fileSystem: files.fileSystem,
    temporaryId: () => "test",
  });

  assert.deepEqual(renderedFrames, [17, 18, 19]);
  assert.equal(Buffer.concat(ffmpeg.chunks).toString(), "png-17|png-18|png-19|");
  assert.deepEqual(receipts, [{ frame: 17 }, { frame: 18 }, { frame: 19 }]);
  assert.equal(ffmpeg.calls.length, 1);
  assert.equal(ffmpeg.calls[0].program, "ffmpeg");
  assert.deepEqual(ffmpeg.calls[0].options, { stdio: ["pipe", "ignore", "pipe"] });
  assert.deepEqual(ffmpeg.calls[0].args, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "image2pipe",
    "-framerate", "24",
    "-i", "pipe:0",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "/output/.clip.stage-test.mp4",
  ]);
  assert.deepEqual(files.renames, [{
    source: "/output/.clip.stage-test.mp4",
    destination: "/output/clip.mp4",
  }]);
  assert.deepEqual(files.removals, []);
});

test("ffmpeg failure rejects the range instead of returning frame receipts", async () => {
  const ffmpeg = createFfmpegStub({
    exitCode: 23,
    stderr: "synthetic encoder failure",
  });
  let returnedReceipts = null;

  await assert.rejects(
    async () => {
      returnedReceipts = await renderFrameRange({
        start: 1,
        end: 2,
        fps: 12,
        output: "/output/broken.mp4",
        renderFrame: async (frame) => ({
          buffer: Buffer.from(`png-${frame}|`),
          receipt: { frame },
        }),
        spawnProcess: ffmpeg.spawnProcess,
      });
    },
    /ffmpeg failed:\nsynthetic encoder failure/,
  );

  assert.equal(returnedReceipts, null);
});

test("ffmpeg spawn failure is reported as an encoder failure", async () => {
  const spawnError = new Error("spawn ffmpeg ENOENT");
  const ffmpeg = createFfmpegStub({ spawnError });

  await assert.rejects(
    () => renderFrameRange({
      start: 1,
      end: 1,
      fps: 24,
      output: "/output/broken.mp4",
      renderFrame: async (frame) => ({
        buffer: Buffer.from("png-1|"),
        receipt: { frame },
      }),
      spawnProcess: ffmpeg.spawnProcess,
    }),
    (error) => error.message === "ffmpeg failed:\nspawn ffmpeg ENOENT"
      && error.cause === spawnError,
  );
});

test("render failure stops ffmpeg and preserves the renderer error", async () => {
  const ffmpeg = createFfmpegStub();
  const renderError = new Error("render frame 2 failed");

  await assert.rejects(
    () => renderFrameRange({
      start: 1,
      end: 3,
      fps: 24,
      output: "/output/broken.mp4",
      renderFrame: async (frame) => {
        if (frame === 2) throw renderError;
        return { buffer: Buffer.from("png-1|"), receipt: { frame } };
      },
      spawnProcess: ffmpeg.spawnProcess,
    }),
    (error) => error === renderError,
  );

  assert.equal(ffmpeg.child.killed, true);
});

test("render failure preserves an existing output and removes the partial stage", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-stream-render-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const output = path.join(directory, "clip.mp4");
  await fs.writeFile(output, "previous verified video");
  const ffmpeg = createFfmpegStub();
  const renderError = new Error("render frame 2 failed");

  await assert.rejects(
    () => renderFrameRange({
      start: 1,
      end: 3,
      fps: 24,
      output,
      renderFrame: async (frame) => {
        if (frame === 2) throw renderError;
        return { buffer: Buffer.from("png-1|"), receipt: { frame } };
      },
      spawnProcess: ffmpeg.spawnProcess,
      temporaryId: () => "failed",
    }),
    (error) => error === renderError,
  );

  assert.equal(await fs.readFile(output, "utf8"), "previous verified video");
  await assert.rejects(
    () => fs.lstat(path.join(directory, ".clip.stage-failed.mp4")),
    { code: "ENOENT" },
  );
});
