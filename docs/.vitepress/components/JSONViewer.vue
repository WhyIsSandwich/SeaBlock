<template>
  <div :class="$style.jsonViewer">
    <div :class="$style.jsonContent">
      <button
        :class="$style.copyButton"
        title="Copy JSON"
        @click="copyToClipboard"
      >
        📋
      </button>
      <JsonNode
        :data="data"
        :level="0"
        :path="[]"
        @copy="copyToClipboard"
      />
    </div>
  </div>
</template>

<script>
import JsonNode from './JsonNode.vue'

export default {
  name: 'JSONViewer',
  components: {
    JsonNode
  },
  props: {
    data: {
      type: [Object, Array, String, Number, Boolean],
      required: true
    }
  },
  methods: {
    async copyToClipboard() {
      try {
        const jsonString = JSON.stringify(this.data, null, 2)
        await navigator.clipboard.writeText(jsonString)
        // You could add a toast notification here
        console.log('JSON copied to clipboard')
      } catch (error) {
        console.error('Failed to copy JSON:', error)
      }
    }
  }
}
</script>

<style module>
.jsonViewer {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  overflow: auto;
  max-height: 400px;
  position: relative;
}

.jsonContent {
  padding: 8px;
  color: #e0e0e0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
  position: relative;
}

.copyButton {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(26, 26, 26, 0.9);
  border: 1px solid #555;
  color: #e0e0e0;
  padding: 4px 6px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  z-index: 10;
  backdrop-filter: blur(4px);
}

.copyButton:hover {
  background: rgba(58, 58, 58, 0.95);
  border-color: #666;
  transform: scale(1.05);
}

/* Scrollbar styling */
.jsonViewer::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.jsonViewer::-webkit-scrollbar-track {
  background: #2a2a2a;
  border-radius: 4px;
}

.jsonViewer::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.jsonViewer::-webkit-scrollbar-thumb:hover {
  background: #666;
}
</style>
