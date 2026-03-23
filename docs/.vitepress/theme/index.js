import DefaultTheme from 'vitepress/theme'

import Tooltip from '../components/Tooltip.vue'
import SpriteIcon from '../components/SpriteIcon.vue'
import IconButton from '../components/IconButton.vue'
import Factoriopedia from '../components/Factoriopedia.vue'
import FactorioScene from '../components/FactorioScene.vue'
import ResearchMapHost from '../components/ResearchMapHost.vue'

import Layout from './Layout.vue'
import './custom.css'
import './editor-styles.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    // Register global components
    app.component('Tooltip', Tooltip)
    app.component('SpriteIcon', SpriteIcon)
    app.component('IconButton', IconButton)
    app.component('Factoriopedia', Factoriopedia)
    app.component('FactorioScene', FactorioScene)
    app.component('ResearchMapHost', ResearchMapHost)
  }
}
