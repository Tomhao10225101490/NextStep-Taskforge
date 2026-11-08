import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve("dist");
http
  .createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = resolve(root, "." + (path === "/" ? "/index.html" : path));
      if (!file.startsWith(root + "/")) {
        res.writeHead(403).end();
        return;
      }
      const content = await readFile(file);
      res
        .writeHead(200, {
          "Content-Type":
            {
              ".html": "text/html",
              ".js": "text/javascript",
              ".css": "text/css",
              ".svg": "image/svg+xml",
              ".json": "application/json",
            }[extname(file)] || "application/octet-stream",
          "Cache-Control": "no-store",
        })
        .end(content);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(8510, "127.0.0.1", () =>
    console.log("NextStep: http://127.0.0.1:8510"),
  );
