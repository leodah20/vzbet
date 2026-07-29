import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainErrorFilter } from './shared/presentation/domain-error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new DomainErrorFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
