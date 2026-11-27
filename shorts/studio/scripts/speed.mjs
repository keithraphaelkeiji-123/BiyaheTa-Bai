// usage: node scripts/speed.mjs '<inputProps json>' scale frames  -> renders frames into one mp4, prints per-frame time
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [props = "{}", scale = "0.6667", range = "880-885", out = "out/lake/speed.mp4", conc = "1"] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
const inputProps = JSON.parse(props);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.tsx"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP || "LakeShort", browserExecutable, chromiumOptions, inputProps });
const [a, b] = range.split("-").map(Number);
let t0 = Date.now(), last = 0;
await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: out, scale: Number(scale), browserExecutable, chromiumOptions, inputProps,
  frameRange: [a, b], concurrency: Number(conc), timeoutInMilliseconds: 600000, crf: 16,
  onProgress: ({ renderedFrames }) => { if (renderedFrames !== last) { last = renderedFrames; console.log("frames", renderedFrames, ((Date.now() - t0) / 1000).toFixed(1) + "s"); } } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(1));
