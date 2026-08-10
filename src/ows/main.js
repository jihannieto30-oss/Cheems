import { createApp } from 'vue'
import './styles/tokens.css'
import './styles/base.css'
import OwsApp from './OwsApp.vue'
import reveal from './directives/reveal'

createApp(OwsApp).directive('reveal', reveal).mount('#ows')
