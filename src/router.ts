import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/HomePage.vue'),
    meta: { title: 'CPE加加' },
  },
  {
    path: '/product',
    name: 'product',
    component: () => import('@/pages/ProductPage.vue'),
    meta: { title: '产品介绍' },
  },
  {
    path: '/download',
    name: 'download',
    component: () => import('@/pages/DownloadPage.vue'),
    meta: { title: '下载 CPE加加' },
  },
  {
    path: '/changelog',
    name: 'changelog',
    component: () => import('@/pages/ChangelogPage.vue'),
    meta: { title: '更新日志' },
  },
  {
    path: '/status',
    name: 'status',
    component: () => import('@/pages/StatusPage.vue'),
    meta: { title: '服务状态' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/pages/AboutPage.vue'),
    meta: { title: '关于 CPE加加' },
  },
  {
    path: '/analytics',
    name: 'analytics',
    component: () => import('@/pages/AnalyticsPage.vue'),
    meta: { title: '访问统计' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  async scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      // Wait for the outgoing page transition before finding the section.
      await new Promise((resolve) => setTimeout(resolve, 200))
      return { el: to.hash, top: 100, behavior: 'auto' }
    }
    return { top: 0, behavior: 'auto' }
  },
})
