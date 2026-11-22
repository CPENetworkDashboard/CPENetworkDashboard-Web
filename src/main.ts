import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import '@fontsource-variable/noto-sans-sc/wght.css'
import './styles.css'

createApp(App).use(router).mount('#app')
