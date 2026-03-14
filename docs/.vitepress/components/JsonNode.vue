<template>
  <div :class="$style.jsonNode">
    <!-- Object/Array node -->
    <div
      v-if="isObjectOrArray"
      :class="$style.nodeContainer"
    >
      <div
        :class="$style.nodeHeader"
        @click="toggleExpanded"
      >
        <span :class="$style.expandIcon">{{ isExpanded ? '▼' : '▶' }}</span>
        <span :class="$style.nodeKey">{{ getNodeLabel() }}</span>
        <span :class="$style.nodeType">{{ getTypeLabel() }}</span>
        <span :class="$style.nodeCount">{{ getCountLabel() }}</span>
      </div>

      <div
        v-if="isExpanded"
        :class="$style.nodeChildren"
      >
        <JsonNode
          v-for="(value, key) in getObjectEntries()"
          :key="key"
          :data="value"
          :level="level + 1"
          :path="[...path, key]"
          :parent-key="key"
          @copy="$emit('copy')"
        />
      </div>
    </div>

    <!-- Primitive value node -->
    <div
      v-else
      :class="[$style.primitiveNode, { [$style.primitiveNodeWithKey]: parentKey !== null }]"
    >
      <span
        v-if="parentKey !== null"
        :class="$style.primitiveKey"
      >{{ parentKey }}:</span>
      <span :class="[$style[getValueClass()]]">{{ formatValue() }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JsonNode',
  props: {
    data: {
      type: [Object, Array, String, Number, Boolean, null],
      required: true
    },
    level: {
      type: Number,
      default: 0
    },
    path: {
      type: Array,
      default: () => []
    },
    parentKey: {
      type: [String, Number],
      default: null
    }
  },
  emits: ['copy'],
  data() {
    return {
      isExpanded: this.level < 2 // Auto-expand first 2 levels
    }
  },
  computed: {
    isObjectOrArray() {
      return this.data !== null && typeof this.data === 'object'
    },
    isArray() {
      return Array.isArray(this.data)
    },
    isObject() {
      return !Array.isArray(this.data) && typeof this.data === 'object'
    }
  },
  methods: {
    toggleExpanded() {
      this.isExpanded = !this.isExpanded
    },

    getNodeLabel() {
      if (this.parentKey !== null) {
        return this.parentKey
      }
      return this.isArray ? 'Array' : 'Object'
    },

    getTypeLabel() {
      if (this.isArray) return 'array'
      if (this.isObject) return 'object'
      return typeof this.data
    },

    getCountLabel() {
      if (this.isArray) {
        return `${this.data.length} items`
      }
      if (this.isObject) {
        const keys = Object.keys(this.data)
        return `${keys.length} properties`
      }
      return ''
    },

    getObjectEntries() {
      if (this.isArray) {
        return this.data
      }
      if (this.isObject) {
        return this.data
      }
      return {}
    },

    formatValue() {
      if (this.data === null) return 'null'
      if (this.data === undefined) return 'undefined'
      if (typeof this.data === 'string') return `"${this.data}"`
      if (typeof this.data === 'boolean') return this.data.toString()
      if (typeof this.data === 'number') return this.data.toString()
      return String(this.data)
    },

    getValueClass() {
      const type = typeof this.data
      if (type === 'string') return 'stringValue'
      if (type === 'number') return 'numberValue'
      if (type === 'boolean') return 'booleanValue'
      if (this.data === null) return 'nullValue'
      if (this.data === undefined) return 'undefinedValue'
      return 'stringValue'
    }
  }
}
</script>

<style module>
.jsonNode {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.nodeContainer {
  margin-left: 0;
}

.nodeHeader {
  display: flex;
  align-items: center;
  padding: 2px 4px;
  cursor: pointer;
  user-select: none;
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.nodeHeader:hover {
  background-color: #333;
}

.expandIcon {
  margin-right: 6px;
  color: #888;
  font-size: 10px;
  width: 12px;
  text-align: center;
}

.nodeKey {
  color: #e0e0e0;
  font-weight: 600;
  margin-right: 8px;
}

.nodeType {
  color: #888;
  font-size: 11px;
  margin-right: 8px;
  text-transform: uppercase;
}

.nodeCount {
  color: #666;
  font-size: 11px;
}

.nodeChildren {
  margin-left: 16px;
  border-left: 1px solid #333;
  padding-left: 8px;
}

.primitiveNode {
  display: flex;
  align-items: center;
  padding: 1px 4px;
  margin: 1px 0;
}

.primitiveNodeWithKey {
  margin-left: 16px;
}

.primitiveKey {
  color: #e0e0e0;
  font-weight: 600;
  margin-right: 8px;
}

.stringValue {
  color: #98d982;
}

.numberValue {
  color: #f9a825;
}

.booleanValue {
  color: #42a5f5;
}

.nullValue {
  color: #888;
  font-style: italic;
}

.undefinedValue {
  color: #888;
  font-style: italic;
}
</style>
