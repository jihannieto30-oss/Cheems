import { createApp } from 'vue'
import './styles/tokens.css'
import './styles/base.css'
import OwsApp from './OwsApp.vue'
import router from './router'
import reveal from './directives/reveal'

createApp(OwsApp).use(router).directive('reveal', reveal).mount('#ows')
