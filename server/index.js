import Koa from "koa";
import { extname, resolve } from "path";
import fs from "fs";
import { promisify } from "util";
import jwt from "koa-jwt";

const app = new Koa();

app.use(({ request, response }, next) => {
  if (
    !request.url.startsWith("/api/video") ||
    !request.query.video ||
    !request.query.video.match(/^[a-z\d-_]+\.(mp4|webm|mov)$/i)
  ) {
    response.redirect("https://www.jean-porcher.com");
    return;
  }
  return next();
});

app.use(
  jwt({
    secret: "secret",
    algorithms: ["HS256", "HS512"],
    getToken: ({ request }) => request.query.token,
  })
);

app.use(async ({ request, response, state }, next) => {
  const video = resolve("videos", request.query.video);

  const range = request.header.range;

  if (!range) {
    response.type = extname(video);
    response.body = fs.createReadStream(video);
    console.log("heloo");
    return next();
  }

  const parts = range.replace("bytes=", "").split("-");
  const videoStat = await promisify(fs.stat)(video);
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : videoStat.size - 1;
  response.set("Content-Range", `bytes ${start}-${end}/${videoStat.size}`);
  response.set("Accept-Ranges", "bytes");
  response.set("Content-Length", end - start + 1);
  response.status = 206;
  response.body = fs.createReadStream(video, { start, end });
});

app.on("error", (err, ctx) => {
  //
});

app.listen(3000);
