<template>
  <div :class="[$style.statistics, { [$style.embedded]: embedded }]">
    <div
      v-for="stat in statistics"
      :key="stat.label"
      :class="$style.statItem"
    >
      <strong>{{ stat.label }}{{ stat.value ? ': ' : ''
      }}<FactorioRichText
        v-if="stat.value"
        :text="stat.value"
      /></strong>
      <template v-if="stat.children">
        <ul
          v-if="stat.children.length > 0"
          :class="$style.resistanceList"
        >
          <li
            v-for="child in stat.children"
            :key="child.label"
          >
            <strong>{{ child.label }}{{ child.value ? ': ' : ''
            }}<FactorioRichText
              v-if="child.value"
              :text="child.value"
            /></strong>
            <ul
              v-if="child?.children?.length > 0"
              :class="$style.resistanceList"
            >
              <li
                v-for="grandchild in child.children"
                :key="grandchild.label"
              >
                {{ grandchild.label }}{{ grandchild.value ? ': ' : '' }}
                <FactorioRichText
                  v-if="grandchild.value"
                  :text="grandchild.value"
                />
              </li>
            </ul>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<script>
import FactorioRichText from './FactorioRichText.vue'
export default {
  name: 'Statistics',
  components: {
    FactorioRichText
  },
  props: {
    statistics: {
      type: Array,
      required: true
    },
    embedded: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style module>
.statistics {
  margin-bottom: 12px;
  padding: 10px;
  background: linear-gradient(135deg, #2d2d2d, #252525);
  border-radius: 2px;
  border: 1px solid #3f3f3f;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    inset 0 1px 2px rgba(0, 0, 0, 0.35);
}

.embedded {
  margin-bottom: 0;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.statItem {
  margin-bottom: 6px;
  color: #ffffff;
  font-size: 13px;
  line-height: 1.35;
}

.statItem:last-child {
  margin-bottom: 0;
}

.statItem strong {
  color: #ffffff;
  font-weight: 600;
}

.resistanceList {
  margin: 4px 0 0 0;
  padding-left: 16px;
  color: #ffffff;
  font-size: 13px;
  line-height: 1.3;
  list-style-type: square;
}

.resistanceList li {
  margin-bottom: 2px;
}

/* Second level children - also square bullets */
.resistanceList .resistanceList {
  list-style-type: square;
}
</style>
