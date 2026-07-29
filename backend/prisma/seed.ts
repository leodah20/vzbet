import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const REGION = 'Ferraz de Vasconcelos';

// Times reais das ligas amadoras "Copa Metal Ferraz Municipal" e "Copa das
// Comunidades" (Ferraz de Vasconcelos/SP). Nomes vindos de tabelas de
// classificação/chaveamento públicas fornecidas pelo usuário. Times que
// aparecem nas duas competições foram unificados num único cadastro.
const TEAM_NAMES = [
  'Roma FC',
  '100 Freio FC',
  'Bola de Fogo FC',
  'Santa Rosa FC',
  'IVS FC',
  'Unidos da Paraíba',
  'Leões do Norte',
  'União do Jacarezinho',
  'AE Avenida',
  'Vila Santo Antônio',
  'EC União',
  'Raça Ruim',
  'Jamil City',
  'Favela City Leão',
  'Barroca',
  'Jardim das Flores',
  'Estrela do Norte',
  '12 Da Leste',
  'Dinamite',
  'Pérola',
  'Esquadrão',
  'Beira Rio',
  'Santa Cruz',
  'Bronx',
  'Juventus',
  'Jardim do Sol',
  'Unidos da Nove',
  'Favela City',
  'Arco-íris',
  'Razão Brasileira',
  '100 Mistério',
  'Bola de Neve FC',
  'EC Nacional',
  'Vila Cristina FC',
];

// Confrontos futuros (sem placar) para ter algo navegável no demo, sem
// inventar resultados históricos de times reais. Datas espalhadas nas
// próximas semanas a partir de hoje.
const UPCOMING_FIXTURES: Array<{
  championship: string;
  home: string;
  away: string;
  daysFromNow: number;
  round: number;
}> = [
  { championship: 'Copa Metal Ferraz Municipal', home: 'Roma FC', away: 'Bola de Fogo FC', daysFromNow: 7, round: 4 },
  { championship: 'Copa Metal Ferraz Municipal', home: 'Raça Ruim', away: 'EC União', daysFromNow: 7, round: 4 },
  { championship: 'Copa Metal Ferraz Municipal', home: 'Jamil City', away: '100 Freio FC', daysFromNow: 8, round: 4 },
  { championship: 'Copa Metal Ferraz Municipal', home: 'União do Jacarezinho', away: 'Favela City Leão', daysFromNow: 8, round: 4 },
  { championship: 'Copa das Comunidades', home: 'Roma FC', away: '100 Freio FC', daysFromNow: 10, round: 1 },
  { championship: 'Copa das Comunidades', home: 'IVS FC', away: 'União do Jacarezinho', daysFromNow: 10, round: 1 },
  { championship: 'Copa das Comunidades', home: 'EC União', away: 'Santa Rosa FC', daysFromNow: 11, round: 1 },
  { championship: 'Copa das Comunidades', home: 'Bola de Neve FC', away: 'Vila Santo Antônio', daysFromNow: 11, round: 1 },
];

async function main() {
  console.log('Limpando dados anteriores...');
  await prisma.prediction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  await prisma.championship.deleteMany();
  await prisma.user.deleteMany();

  console.log(`Cadastrando ${TEAM_NAMES.length} times...`);
  const teamsByName = new Map<string, { id: string }>();
  for (const name of TEAM_NAMES) {
    const team = await prisma.team.create({ data: { name, region: REGION } });
    teamsByName.set(name, team);
  }

  console.log('Cadastrando campeonatos...');
  const now = new Date();
  const metalFerraz = await prisma.championship.create({
    data: {
      name: 'Copa Metal Ferraz Municipal',
      season: '2026',
      format: 'PONTOS_CORRIDOS',
      startDate: new Date(now.getFullYear(), 2, 1),
      endDate: new Date(now.getFullYear(), 11, 15),
    },
  });
  const comunidades = await prisma.championship.create({
    data: {
      name: 'Copa das Comunidades',
      season: '2026',
      format: 'PONTOS_CORRIDOS',
      startDate: new Date(now.getFullYear(), 6, 1),
      endDate: new Date(now.getFullYear(), 10, 30),
    },
  });
  const championshipsByName = new Map([
    ['Copa Metal Ferraz Municipal', metalFerraz],
    ['Copa das Comunidades', comunidades],
  ]);

  console.log(`Agendando ${UPCOMING_FIXTURES.length} partidas futuras...`);
  for (const fixture of UPCOMING_FIXTURES) {
    const championship = championshipsByName.get(fixture.championship);
    const homeTeam = teamsByName.get(fixture.home);
    const awayTeam = teamsByName.get(fixture.away);
    if (!championship || !homeTeam || !awayTeam) {
      throw new Error(`Fixture referencia time/campeonato inexistente: ${JSON.stringify(fixture)}`);
    }
    const kickoffAt = new Date(now.getTime() + fixture.daysFromNow * 24 * 60 * 60 * 1000);
    kickoffAt.setHours(15, 0, 0, 0);
    await prisma.match.create({
      data: {
        championshipId: championship.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        round: fixture.round,
        kickoffAt,
        status: 'AGENDADA',
      },
    });
  }

  console.log('Seed concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
