<!--
  FactorioRichText Component
  
  Parses and renders Factorio's rich text format using Vue's render function.
  Supports the following tag types:
  
  - [item=name] - Item references
  - [recipe=name] - Recipe references  
  - [fluid=name] - Fluid references
  - [entity=name] - Entity references
  - [technology=name] - Technology references
  - [achievement=name] - Achievement references
  - [color=color] - Color formatting
  - [font=font] - Font family
  - [size=size] - Font size
  - [bold] - Bold text
  - [italic] - Italic text
  - [underline] - Underlined text
  
  Usage:
  <FactorioRichText :text="'This is a [item=iron-plate] in the text'" />
-->
<template>
  <component :is="renderRichText" />
</template>

<script setup>
import { computed, h } from 'vue'

import IconButton from './IconButton.vue'
import SpriteIcon from './SpriteIcon.vue'
import { parseFactorioRichText, renderFactorioRichTextTokens } from './factorioRichText.js'

const props = defineProps({
  text: {
    required: true
  }
})

// Render rich text using Vue render function
const renderRichText = computed(() => {
  const text = props.text ? props.text.toString() : ''
  const strict = Boolean(import.meta.env?.DEV)
  const { tokens } = parseFactorioRichText(text, { strict })
  const { nodes } = renderFactorioRichTextTokens(tokens, { strict, IconButton, SpriteIcon })
  return h('span', { class: 'factorio-richtext' }, nodes)
})
</script>

<style scoped>
/* Factorio game objects are now handled by IconButton component */
.factorio-richtext {
  white-space: pre-line;
}

.factorio-richtext :deep(.factorio-richtext-tag-ref) {
  opacity: 0.8;
  border-bottom: 1px dotted var(--vp-c-border);
}

.factorio-richtext :deep(.factorio-richtext-tooltip) {
  border-bottom: 1px dotted var(--vp-c-border);
}

.factorio-richtext :deep(.factorio-richtext-quality) {
  opacity: 0.8;
}
</style>
