import type {
  Cargo,
  Disciplina,
  Edital,
  EventoCalendario,
  Orgao,
  Perfil,
  Topico,
} from '@/types/domain'

export const orgaosIniciais: Orgao[] = [
  ['trt7', 'TRT-7', 'Tribunal Regional do Trabalho da 7ª Região', 'federal', 'Fortaleza', 'CE'],
  ['tjce', 'TJCE', 'Tribunal de Justiça do Estado do Ceará', 'estadual', 'Fortaleza', 'CE'],
  ['sefaz', 'SEFAZ-CE', 'Secretaria da Fazenda do Ceará', 'estadual', 'Fortaleza', 'CE'],
  ['pf', 'PF', 'Polícia Federal', 'federal', 'Brasília', 'DF'],
  ['ibama', 'IBAMA', 'Instituto Brasileiro do Meio Ambiente', 'federal', 'Brasília', 'DF'],
  ['inss', 'INSS', 'Instituto Nacional do Seguro Social', 'federal', 'Brasília', 'DF'],
  ['bcb', 'BCB', 'Banco Central do Brasil', 'federal', 'Brasília', 'DF'],
  ['mpce', 'MPCE', 'Ministério Público do Estado do Ceará', 'estadual', 'Fortaleza', 'CE'],
  ['caucaia', 'PMC', 'Prefeitura Municipal de Caucaia', 'municipal', 'Caucaia', 'CE'],
  ['senado', 'SF', 'Senado Federal', 'federal', 'Brasília', 'DF'],
].map(
  ([id, sigla, nome, atuacao, municipioSede, ufSede]) =>
    ({ id, sigla, nome, atuacao, municipioSede, ufSede }) as Orgao,
)

const situacoes: Edital['situacao'][] = [
  'inscrições abertas',
  'em andamento',
  'previsto',
  'autorizado',
  'banca definida',
  'vigente',
  'comissão formada',
  'prorrogado',
  'encerrado',
  'anulado',
]
const bancas = ['FCC', 'Cebraspe', 'FGV', 'Cesgranrio', 'Idecan']

export const editaisIniciais: Edital[] = orgaosIniciais.map((orgao, index) => ({
  id: `edital-${index + 1}`,
  titulo: `Concurso ${orgao.sigla} ${2024 + (index % 3)}`,
  numero: `${String(index + 1).padStart(2, '0')}/2026`,
  orgaoId: orgao.id,
  banca: bancas[index % bancas.length] ?? 'Cebraspe',
  situacao: situacoes[index] ?? 'previsto',
  dataPublicacao: `2026-${String((index % 9) + 1).padStart(2, '0')}-${String((index % 20) + 3).padStart(2, '0')}`,
  urlDocumento: `https://exemplo.org/editais/${orgao.id}`,
  observacoes: index % 2 === 0 ? 'Acompanhar retificações e cronograma oficial.' : '',
}))

export const cargosIniciais: Cargo[] = [
  { id: 'analista', area: 'Administrativa', nome: 'Analista' },
  { id: 'tecnico', area: 'Apoio', nome: 'Técnico' },
  { id: 'auditor', area: 'Fiscal', nome: 'Auditor' },
]

export const perfisIniciais: Perfil[] = Array.from({ length: 40 }, (_, index) => ({
  id: `perfil-${index + 1}`,
  editalId: `edital-${(index % 10) + 1}`,
  cargoId: cargosIniciais[index % 3]?.id ?? 'analista',
  remuneracao: 5200 + index * 310,
  vagasAmpla: (index % 8) + 1,
  vagasCadastroReserva: (index % 5) * 2,
  cargaHoraria: index % 3 === 0 ? 30 : 40,
  municipioLotacao: index % 4 === 0 ? 'Fortaleza' : 'Diversos municípios',
  ufLotacao: index % 5 === 0 ? 'DF' : 'CE',
}))

export const disciplinasIniciais: Disciplina[] = [
  ['portugues', 'Língua Portuguesa', '#2563eb'],
  ['constitucional', 'Direito Constitucional', '#7c3aed'],
  ['administrativo', 'Direito Administrativo', '#db2777'],
  ['informatica', 'Informática', '#0891b2'],
  ['logica', 'Raciocínio Lógico', '#ea580c'],
  ['atualidades', 'Atualidades', '#16a34a'],
  ['penal', 'Direito Penal', '#dc2626'],
  ['processual', 'Direito Processual', '#9333ea'],
  ['contabilidade', 'Contabilidade Geral', '#0f766e'],
  ['tributario', 'Direito Tributário', '#ca8a04'],
].map(([id, nome, cor], index) => ({ id, nome, cor, ordem: index + 1 }))

const titulos = [
  'Fundamentos e princípios',
  'Interpretação e aplicação',
  'Normas essenciais',
  'Questões recorrentes',
]
export const topicosIniciais: Topico[] = disciplinasIniciais.flatMap(
  (disciplina, disciplinaIndex) =>
    titulos.map((titulo, index) => ({
      id: `${disciplina.id}-${index + 1}`,
      disciplinaId: disciplina.id,
      perfilId: `perfil-${((disciplinaIndex * 4 + index) % 40) + 1}`,
      titulo: `${titulo} de ${disciplina.nome}`,
      pesoProva: (index + 1) * 2,
      questoesCertas: (disciplinaIndex + index) * 3,
      questoesErradas: (disciplinaIndex + index) % 6,
      concluido: index === 0 || (disciplinaIndex + index) % 5 === 0,
      ordem: index + 1,
    })),
)

export const eventosIniciais: EventoCalendario[] = editaisIniciais.flatMap((edital, index) => [
  {
    id: `evento-${index + 1}-pub`,
    editalId: edital.id,
    tipo: 'publicação de edital',
    data: edital.dataPublicacao,
  },
  {
    id: `evento-${index + 1}-prova`,
    editalId: edital.id,
    tipo: 'prova',
    data: `2026-${String(((index + 7) % 12) + 1).padStart(2, '0')}-${String((index % 20) + 7).padStart(2, '0')}`,
  },
])
