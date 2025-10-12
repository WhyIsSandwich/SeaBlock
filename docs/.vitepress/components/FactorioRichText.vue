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

const props = defineProps({
  text: {
    required: true
  }
})

// Parse Factorio rich text format
function parseRichText(text) {
  if (!text) return []

  const tokens = []
  let currentIndex = 0

  // Regular expression to match Factorio rich text tags
  const tagRegex = /\[([^[\]]+)\]/g
  let match

  while ((match = tagRegex.exec(text)) !== null) {
    // Add text before the tag
    if (match.index > currentIndex) {
      const textContent = text.slice(currentIndex, match.index)
      if (textContent) {
        tokens.push({ type: 'text', content: textContent })
      }
    }

    // Parse the tag
    const tagContent = match[1]
    const tag = parseTag(tagContent)
    if (tag) {
      tokens.push(tag)
    } else {
      // If we can't parse the tag, treat it as text
      tokens.push({ type: 'text', content: match[0] })
    }

    currentIndex = match.index + match[0].length
  }

  // Add remaining text
  if (currentIndex < text.length) {
    const textContent = text.slice(currentIndex)
    if (textContent) {
      tokens.push({ type: 'text', content: textContent })
    }
  }

  return tokens
}

// Parse individual tags
function parseTag(tagContent) {
  // Handle different tag types
  if (tagContent.startsWith('item=')) {
    const itemName = tagContent.slice(5)
    return { type: 'item', name: itemName }
  }

  if (tagContent.startsWith('recipe=')) {
    const recipeName = tagContent.slice(7)
    return { type: 'recipe', name: recipeName }
  }

  if (tagContent.startsWith('fluid=')) {
    const fluidName = tagContent.slice(6)
    return { type: 'fluid', name: fluidName }
  }

  if (tagContent.startsWith('entity=')) {
    const entityName = tagContent.slice(7)
    return { type: 'entity', name: entityName }
  }

  if (tagContent.startsWith('technology=')) {
    const techName = tagContent.slice(11)
    return { type: 'technology', name: techName }
  }

  if (tagContent.startsWith('achievement=')) {
    const achievementName = tagContent.slice(12)
    return { type: 'achievement', name: achievementName }
  }

  // Handle color tags
  if (tagContent.startsWith('color=')) {
    const color = tagContent.slice(6)
    return { type: 'color', color }
  }

  // Handle font tags
  if (tagContent.startsWith('font=')) {
    const font = tagContent.slice(5)
    return { type: 'font', font }
  }

  // Handle size tags
  if (tagContent.startsWith('size=')) {
    const size = tagContent.slice(5)
    return { type: 'size', size }
  }

  // Handle bold/italic/underline
  if (tagContent === 'bold') {
    return { type: 'bold' }
  }

  if (tagContent === 'italic') {
    return { type: 'italic' }
  }

  if (tagContent === 'underline') {
    return { type: 'underline' }
  }

  // Handle closing tags
  if (tagContent.startsWith('/')) {
    return { type: 'close', tag: tagContent.slice(1) }
  }

  return null
}

// Render rich text using Vue render function
const renderRichText = computed(() => {
  const text = props.text || ''
  const tokens = parseRichText(text.toString())
  const elements = renderTokens(tokens)
  return h('span', elements)
})

// Render tokens into Vue components
function renderTokens(tokens) {
  const elements = []
  const stack = [] // Stack to handle nested tags

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token.type === 'text') {
      // Add text content
      if (stack.length > 0) {
        // We're inside a tag, add to the current element
        const currentElement = stack[stack.length - 1]
        if (currentElement.children) {
          currentElement.children.push(token.content)
        } else {
          currentElement.children = [token.content]
        }
      } else {
        // Standalone text - create a text node
        elements.push(token.content)
      }
    } else if (token.type === 'close') {
      // Handle closing tags - just pop from stack, don't create elements
      if (stack.length > 0) {
        stack.pop()
      }
    } else {
      // Handle opening tags
      const element = createElement(token)
      if (element) {
        if (stack.length > 0) {
          // Add to parent element
          const parentElement = stack[stack.length - 1]
          if (parentElement.children) {
            parentElement.children.push(element)
          } else {
            parentElement.children = [element]
          }
        } else {
          // Top level element
          elements.push(element)
        }

        // Add to stack if it's a container element
        if (isContainerElement(token)) {
          stack.push(element)
        }
      }
    }
  }

  // Close any remaining open elements
  while (stack.length > 0) {
    stack.pop()
  }

  return elements
}

// Create Vue element from token
function createElement(token) {
  switch (token.type) {
    case 'item':
      return h(IconButton, {
        type: 'item',
        name: token.name
      })

    case 'recipe':
      return h(IconButton, {
        type: 'recipe',
        name: token.name
      })

    case 'fluid':
      return h(IconButton, {
        type: 'fluid',
        name: token.name
      })

    case 'entity':
      return h(IconButton, {
        type: 'entity',
        name: token.name
      })

    case 'technology':
      return h(IconButton, {
        type: 'technology',
        name: token.name
      })

    case 'achievement':
      return h(IconButton, {
        type: 'achievement',
        name: token.name
      })

    case 'color':
      return h(
        'span',
        {
          style: { color: token.color }
        },
        []
      )

    case 'font':
      return h(
        'span',
        {
          style: { fontFamily: token.font }
        },
        []
      )

    case 'size':
      return h(
        'span',
        {
          style: { fontSize: token.size }
        },
        []
      )

    case 'bold':
      return h('strong', {}, [])

    case 'italic':
      return h('em', {}, [])

    case 'underline':
      return h('u', {}, [])

    default:
      return null
  }
}

// Check if token creates a container element
function isContainerElement(token) {
  return ['color', 'font', 'size', 'bold', 'italic', 'underline'].includes(token.type)
}
</script>

<style scoped>
/* Factorio game objects are now handled by IconButton component */
</style>
