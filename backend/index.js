const { NestFactory } = require("@nestjs/core");
const { ExpressAdapter } = require("@nestjs/platform-express");
const { AppModule } = require("./dist/src/app.module");
const { ValidationPipe } = require("@nestjs/common");
const express = require("express");

const server = express();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? "*").split(","),
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const uploadDir = process.env.UPLOAD_DIR ?? (process.env.VERCEL ? "/tmp" : "./uploads");
  app.use("/uploads/files", express.static(uploadDir));
  await app.init();
  return server;
}

let cachedServer;

module.exports = async (req, res) => {
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  return cachedServer(req, res);
};
