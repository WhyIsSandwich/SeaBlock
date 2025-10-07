<template>
  <div :class="$style.rawSection">
    <button :class="$style.rawSectionHeader" @click="toggle">
      <span :class="$style.rawSectionTitle">{{ title }}</span>
      <span :class="$style.rawSectionToggle">{{ isOpen ? '▼' : '▶' }}</span>
    </button>
    <div v-if="isOpen" :class="$style.rawSectionContent">
      <JSONViewer :data="data" />
    </div>
  </div>
</template>

<script>
import JSONViewer from './JSONViewer.vue'

export default {
  name: 'RawSection',
  components: {
    JSONViewer
  },
  props: {
    title: {
      type: String,
      required: true
    },
    data: {
      type: [Object, Array, String, Number, Boolean],
      required: true
    },
    isOpen: {
      type: Boolean,
      default: false
    }
  },
  emits: ['toggle'],
  methods: {
    toggle() {
      this.$emit('toggle')
    }
  }
}
</script>

<style module>
.rawSection {
  margin-bottom: 8px;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  background: #2a2a2a;
}

.rawSectionHeader {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #3a3a3a;
  border: none;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.rawSectionHeader:hover {
  background: #4a4a4a;
}

.rawSectionTitle {
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
}

.rawSectionToggle {
  color: #cccccc;
  font-size: 12px;
  font-weight: bold;
  border: 1px solid #5a5a5a;
  padding: 2px 6px;
  border-radius: 3px;
  background: #2a2a2a;
}

.rawSectionContent {
  padding: 0;
  background: #1a1a1a;
  border-radius: 0 0 4px 4px;
}
</style>
