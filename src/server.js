import { requestDate } from "./scraper.js";
import express from "express";
import { createServer } from "http";
import bodyParser from "body-parser";
import { existsSync, readFileSync } from "fs";
class Server {
  constructor() {
    this.app = express();
    this.app.use(bodyParser.text());
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
.addGetReq("/","canvas-client/CINDI.html","text/html")
.addGetReq("/about.html","client/about.html","text/html")
.addGetReq("/browseUI.html","client/browseUI.html","text/html")
.addGetReq("/CINDI.js","canvas-client/CINDI.js","application/javascript")
.addGetReq("/style.css","client/style.css","text/css")
.addPostReq("/", (req, res) => {
  const args = req.body.split(" ");
  const m = args[0] | 0,
    d = args[1] | 0,
    y = args[2] | 0;
  res.send(requestDate(m, d, y));
});
const server = createServer(CINDIServer.app);
server.listen(3000);
