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
  // Adversários encontrados na pesquisa de resultados reais da Copa das
  // Comunidades 2025 (ver HISTORICAL_RESULTS) que ainda não tinham cadastro.
  'União do Morro F.V',
  'Temporim',
  'Galáticos FC',
];

// Confrontos futuros (sem placar) para ter algo navegável/apostável no demo.
// A 1ª edição da Copa Metal Ferraz já terminou de verdade (ver
// HISTORICAL_RESULTS) — por isso ela não tem rodadas futuras aqui, só a
// Copa das Comunidades (cuja edição 2026 ainda não começou, pelo que a
// pesquisa encontrou). Datas espalhadas nas próximas semanas a partir de hoje.
const UPCOMING_FIXTURES: Array<{
  championship: string;
  home: string;
  away: string;
  daysFromNow: number;
  round: number;
}> = [
  { championship: 'Copa das Comunidades', home: 'Roma FC', away: '100 Freio FC', daysFromNow: 10, round: 4 },
  { championship: 'Copa das Comunidades', home: 'IVS FC', away: 'União do Jacarezinho', daysFromNow: 10, round: 4 },
  { championship: 'Copa das Comunidades', home: 'EC União', away: 'Santa Rosa FC', daysFromNow: 11, round: 4 },
  { championship: 'Copa das Comunidades', home: 'Bola de Neve FC', away: 'Vila Santo Antônio', daysFromNow: 11, round: 4 },
];

// Resultados históricos REAIS, encontrados via pesquisa pública (busca web +
// redes sociais dos times) a pedido do cliente. Cada item cita a fonte usada
// para chegar no placar — nada aqui foi inventado. Nomes de times foram
// mapeados pro cadastro já existente quando o nome variava entre fontes
// (ex.: "100 Freios" -> "100 Freio FC", "ST Antônio" -> "Vila Santo Antônio").
//
// Fontes:
// - Copa Metal Ferraz: Câmara Municipal de Ferraz de Vasconcelos, matéria
//   "Teteco comemora o sucesso da 1ª Copa Metal Ferraz de futebol amador"
//   (camaraferraz.sp.gov.br), confirmada de forma cruzada por múltiplas
//   buscas independentes.
// - Copa das Comunidades: plataforma oficial de gestão de campeonato
//   JogaFácil, campeonato "Liga de Ferraz - Copa das Comunidades"
//   (campeonato.jogafacilapp.com, campeonatoId=1400), temporada 2025 —
//   classificação de grupos, súmulas de jogos e súmula da final local.
//   "Bola de Neve FC" aparece na tabela oficial do JogaFácil como time
//   competidor; não foi possível confirmar de forma independente se é a
//   mesma entidade do perfil social de mesmo nome.
const HISTORICAL_RESULTS: Array<{
  championship: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  date: string;
  hour: number;
  minute: number;
  round: number;
}> = [
  // Copa Metal Ferraz Municipal — final da 1ª edição (2026)
  { championship: 'Copa Metal Ferraz Municipal', home: 'Raça Ruim', away: 'Bola de Fogo FC', homeScore: 5, awayScore: 0, date: '2026-07-24', hour: 15, minute: 0, round: 1 },
  // Copa das Comunidades — fase de grupos 2025 (rodada 1, 07/09/2025)
  { championship: 'Copa das Comunidades', home: 'Bola de Neve FC', away: 'Leões do Norte', homeScore: 1, awayScore: 0, date: '2025-09-07', hour: 15, minute: 0, round: 1 },
  { championship: 'Copa das Comunidades', home: 'Vila Santo Antônio', away: 'EC Nacional', homeScore: 1, awayScore: 0, date: '2025-09-07', hour: 15, minute: 0, round: 1 },
  { championship: 'Copa das Comunidades', home: 'União do Morro F.V', away: 'Unidos da Paraíba', homeScore: 2, awayScore: 0, date: '2025-09-07', hour: 15, minute: 0, round: 1 },
  // Copa das Comunidades — fase de grupos 2025 (rodada 2, 14/09/2025)
  { championship: 'Copa das Comunidades', home: 'Bola de Fogo FC', away: 'Temporim', homeScore: 3, awayScore: 1, date: '2025-09-14', hour: 15, minute: 0, round: 2 },
  { championship: 'Copa das Comunidades', home: '100 Freio FC', away: 'Roma FC', homeScore: 0, awayScore: 0, date: '2025-09-14', hour: 15, minute: 0, round: 2 },
  { championship: 'Copa das Comunidades', home: 'IVS FC', away: 'AE Avenida', homeScore: 0, awayScore: 0, date: '2025-09-14', hour: 15, minute: 0, round: 2 },
  { championship: 'Copa das Comunidades', home: 'União do Jacarezinho', away: 'Galáticos FC', homeScore: 2, awayScore: 1, date: '2025-09-14', hour: 15, minute: 0, round: 2 },
  // Copa das Comunidades — final local de Ferraz (09/10/2025, Campo Raspadão)
  { championship: 'Copa das Comunidades', home: '100 Freio FC', away: 'União do Jacarezinho', homeScore: 0, awayScore: 1, date: '2025-10-09', hour: 9, minute: 0, round: 3 },
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

  console.log(`Cadastrando ${HISTORICAL_RESULTS.length} resultados históricos reais...`);
  for (const result of HISTORICAL_RESULTS) {
    const championship = championshipsByName.get(result.championship);
    const homeTeam = teamsByName.get(result.home);
    const awayTeam = teamsByName.get(result.away);
    if (!championship || !homeTeam || !awayTeam) {
      throw new Error(`Resultado histórico referencia time/campeonato inexistente: ${JSON.stringify(result)}`);
    }
    const [year, month, day] = result.date.split('-').map(Number);
    const kickoffAt = new Date(year, month - 1, day, result.hour, result.minute, 0, 0);
    await prisma.match.create({
      data: {
        championshipId: championship.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        round: result.round,
        kickoffAt,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        status: 'FINALIZADA',
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
