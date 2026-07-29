import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/presentation/auth.module';
import { TeamsModule } from './teams/presentation/teams.module';
import { PlayersModule } from './players/presentation/players.module';
import { ChampionshipsModule } from './championships/presentation/championships.module';
import { MatchesModule } from './matches/presentation/matches.module';
import { PredictionsModule } from './predictions/presentation/predictions.module';

@Module({
  imports: [PrismaModule, AuthModule, TeamsModule, PlayersModule, ChampionshipsModule, MatchesModule, PredictionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
