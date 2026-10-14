import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/localhost(:[0-9]+)?$/.test(origin) || origin === process.env.FRONTEND_URL) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Tài liệu API tự sinh: http://localhost:4000/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Shadowtation API')
    .setDescription('Core API của website học tiếng Anh Dictation & Shadowing')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(process.env.APP_PORT ?? 4000);
  await app.listen(port);
  console.log(`Core API: http://localhost:${port}/api/v1  |  Swagger: http://localhost:${port}/docs`);
}
bootstrap();
