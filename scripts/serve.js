#!/usr/bin/env node
/**
 * Minimal static server for local development. Serves ./public on port 3777.
 */
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public");
const PORT = 3777;

const MIMES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  const p = path.join(PUBLIC, req.url === "/" ? "index.html" : req.url);
  const ext = path.extname(p);
  const mime = MIMES[ext] || "application/octet-stream";

  fs.readFile(p, (err, data) => {
    if (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500);
      res.end(err.code === "ENOENT" ? "Not found" : "Error");
      return;
    }
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Arc Data running at http://localhost:${PORT}`);
});
