import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const files = new Map([
  ["/", ["index.html", "text/html"]],
  ["/index.html", ["index.html", "text/html"]],
  ["/style.css", ["style.css", "text/css"]],
  ["/app.js", ["app.js", "text/javascript"]],
  ["/braid.js", ["braid.js", "text/javascript"]],
  ["/typing.js", ["typing.js", "text/javascript"]],
]);
const port = Number(process.env.PORT || 5173);
createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/every-single-thing-becomes-a-word") {
    response.writeHead(301, { Location: "/" }).end();
    return;
  }
  const file = files.get(pathname);
  if (!file) { response.writeHead(404).end("Not found"); return; }
  try {
    const body = await readFile(new URL(`../public/${file[0]}`, import.meta.url));
    response.writeHead(200, { "Content-Type": `${file[1]}; charset=utf-8`, "Cache-Control": "no-store" });
    response.end(body);
  } catch {
    response.writeHead(500).end("Unable to read file");
  }
}).listen(port, "127.0.0.1", () => console.log(`Preview: http://localhost:${port}`));
