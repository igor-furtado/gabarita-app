export type AtuacaoOrgao = 'municipal' | 'estadual' | 'federal'
export type SituacaoEdital =
  | 'previsto'
  | 'autorizado'
  | 'comissão formada'
  | 'banca definida'
  | 'inscrições abertas'
  | 'em andamento'
  | 'vigente'
  | 'prorrogado'
  | 'anulado'
  | 'encerrado'

export interface Orgao {
  id: string
  sigla: string
  nome: string
  atuacao: AtuacaoOrgao
  municipioSede: string
  ufSede: string
}

export interface Edital {
  id: string
  titulo: string
  numero: string
  orgaoId: string
  banca: string
  situacao: SituacaoEdital
  dataPublicacao: string
  urlDocumento: string
  observacoes: string
}

export interface Cargo {
  id: string
  area: string
  nome: string
}

export interface Perfil {
  id: string
  editalId: string
  cargoId: string
  remuneracao: number
  vagasAmpla: number
  vagasCadastroReserva: number
  cargaHoraria: number
  municipioLotacao: string
  ufLotacao: string
}

export interface Disciplina {
  id: string
  nome: string
  cor: string
  ordem: number
}

export interface Topico {
  id: string
  disciplinaId: string
  perfilId: string
  titulo: string
  pesoProva: number
  questoesCertas: number
  questoesErradas: number
  concluido: boolean
  ordem: number
}

export type TipoEvento =
  'prova' | 'início das inscrições' | 'fim das inscrições' | 'publicação de edital'
export interface EventoCalendario {
  id: string
  editalId: string
  tipo: TipoEvento
  data: string
}

export type NovoOrgao = Omit<Orgao, 'id'>
export type NovoEdital = Omit<Edital, 'id' | 'orgaoId'>
export type NovoCargo = Omit<Cargo, 'id'>
export type NovoPerfil = Omit<Perfil, 'id'>
