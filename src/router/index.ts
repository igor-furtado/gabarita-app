import { createRouter, createWebHistory } from 'vue-router'
import ConcursosPage from '@/features/concursos/ConcursosPage.vue'
import ConcursoDetalhesPage from '@/features/concursos/ConcursoDetalhesPage.vue'
import DisciplinasPage from '@/features/disciplinas/DisciplinasPage.vue'
import CalendarioPage from '@/features/calendario/CalendarioPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/concursos' },
    { path: '/concursos', component: ConcursosPage },
    { path: '/concursos/:id', component: ConcursoDetalhesPage },
    { path: '/disciplinas', component: DisciplinasPage },
    { path: '/calendario', component: CalendarioPage },
  ],
})
