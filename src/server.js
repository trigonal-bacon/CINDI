import { requestDate, convertTo64 } from "./scraper.js";
import { cindi_score } from "./scorer.js";
import express from "express";
import { createServer } from "http";
import bodyParser from "body-parser";
import { existsSync, readFileSync } from "fs";
import cors from "cors";
class Server {
  constructor() {
    this.app = express();
    this.app.use(bodyParser.text());
    this.app.use(cors());
  }
  addGetReq(path, file, type) {
    this.app.get(path, (_, res) => {
      res.setHeader("Content-Type", `${type}; charset=utf-8`);
      if (file && existsSync(file)) {
        res.writeHead(200);
        return res.end(readFileSync(file));
      }
      res.writeHead(404);
    });
    return this;
  }
  addPostReq(path, cb) {
    this.app.post(path, cb);
    return this;
  }
}
const CINDIServer = new Server()
.addPostReq("/", (req, res) => {
  const args = req.body.split(" ");
  const m = args[0] | 0,
    d = args[1] | 0,
    y = args[2] | 0;
    const b = requestDate(m, d, y);
  res.send(b);
}).addPostReq("/to-64", async (req, res) => {
  const url = req.body;
  console.log(url);
  try {
    const resp = await convertTo64(url);
    console.log("----------------------------------------------");
    //console.log(resp);
    res.send(resp);
  } catch(err) {
    console.log(url, "failed\n");
    console.log("error in converting to b64");
  }
}).addPostReq("/score", async (req, res) => {
  try {
    const { path, date, url, pos } = JSON.parse(req.body);
    res.send(await cindi_score(path, date, url, pos));
  }
  catch(e) {
    res.send("bad req");
  }
});
const server = createServer(CINDIServer.app);
server.listen(8081);

console.log("started");
