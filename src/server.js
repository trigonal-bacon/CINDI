import { requestDate } from "./scraper.js";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import bodyParser from "body-parser";
import { existsSync, readFileSync } from "fs";
const app = express();
app.use(bodyParser.text());
app.use(
  cors({
    origin: "https://cindi.glitch.me",
  })
);
app.post("/", (req, res) => {
  const args = req.body.split(" ");
  const m = args[0] | 0,
    d = args[1] | 0,
    y = args[2] | 0;
  res.send(requestDate(m, d, y));
});
app.get("/", (_, res) => {
  const file = "client/index.html";
  res.setHeader("Content-Type", `text/html; charset=utf-8`);
  if (file && existsSync(file)) {
    res.writeHead(200);
    return res.end(readFileSync(file));
  }
  res.writeHead(404);
})
app.get("/index.js", (_, res) => {
  const file = "client/index.js";
  res.setHeader("Content-Type", `application/javascript; charset=utf-8`);
  if (file && existsSync(file)) {
    res.writeHead(200);
    return res.end(readFileSync(file));
  }
  res.writeHead(404);
})
const server = createServer(app);
server.listen(8080);
console.log(app);