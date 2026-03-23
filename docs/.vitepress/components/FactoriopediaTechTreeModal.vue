<template>
  <div
    :class="$style.backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="tech-tree-title"
    @click.self="$emit('close')"
  >
    <div
      ref="panelRef"
      :class="$style.panel"
      tabindex="-1"
      @click.stop
      @keydown="onPanelKeydown"
    >
      <div :class="$style.panelHeader">
        <h3 id="tech-tree-title">Research map</h3>
        <button type="button" :class="$style.closeBtn" aria-label="Close" @click="$emit('close')">
          ×
        </button>
      </div>
      <ResearchMapHost
        fill-parent
        :technology-name="technologyName"
        :show-factoriopedia-link="false"
        :rendered-inside-factoriopedia="true"
      />
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import ResearchMapHost from './ResearchMapHost.vue'

const props = defineProps({
  technologyName: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])

const panelRef = ref(null)

function onPanelKeydown(event) {
  const tag = event.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('close')
  }
}

function focusPanel() {
  nextTick(() => {
    panelRef.value?.focus({ preventScroll: true })
  })
}

onMounted(() => {
  focusPanel()
})

watch(
  () => props.technologyName,
  () => {
    focusPanel()
  }
)

</script>

<style module>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 10040;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0)
    env(safe-area-inset-left, 0);
}

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  background: #2a2a2a;
  border: none;
  border-top: 1px solid #444;
  border-bottom: 1px solid #333;
  color: #e6e6e6;
  box-shadow: none;
  overflow: hidden;
}

.panel:focus {
  outline: none;
}

.panel:focus-visible {
  outline: 2px solid #cf9428;
  outline-offset: 2px;
}

.panelHeader {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #444;
}

.panelHeader h3 {
  margin: 0;
  font-size: 16px;
}

.closeBtn {
  border: none;
  background: transparent;
  color: #ccc;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.empty {
  flex: 1;
  padding: 16px;
  min-height: 0;
}
</style>
