import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { VueQueryPlugin } from "@tanstack/vue-query";
import App from "./App.vue";
import "./style.css";
const router = createRouter({
  history: createWebHistory(),
  routes: [
    "/",
    "/plano",
    "/materias",
    "/revisoes",
    "/erros",
    "/vespera",
    "/progresso",
    "/configuracoes",
  ].map((path) => ({ path, component: { template: "<span />" } })),
});
router.addRoute({ path: "/:pathMatch(.*)*", redirect: "/" });
createApp(App).use(router).use(VueQueryPlugin).mount("#app");
