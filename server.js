import { createServer } from "node:http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

console.log("Next.js server starting...")

app.prepare().then(() => {
  const httpServer = createServer(handler);

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Next.js ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO running on separate backend server (port 4000)`);
    });
});

// Hocuspocus 서버 실행 스크립트
const { startHocuspocusServer } = require('./dist/lib/hocuspocus-server');

// Hocuspocus 서버 시작
startHocuspocusServer()
  .then(() => {
    console.log('Hocuspocus 서버가 시작되었습니다.');
  })
  .catch((error) => {
    console.error('Hocuspocus 서버 시작 중 오류가 발생했습니다:', error);
    process.exit(1);
  });