<template>
  <div :class="$style.statistics">
    <div v-for="stat in statistics" :key="stat.label" :class="$style.statItem">
      <strong>{{ stat.label }}{{ stat.value ? `: ${stat.value}` : '' }}</strong>
      <template v-if="stat.children">
        <ul v-if="stat.children.length > 0" :class="$style.resistanceList">
          <li v-for="child in stat.children" :key="child.label">
            <template v-if="child.children">
              <strong>{{ child.label }}:</strong>
              <ul v-if="child.children.length > 0" :class="$style.resistanceList">
                <li v-for="grandchild in child.children" :key="grandchild.label">
                  {{ grandchild.label }}: {{ grandchild.value }}
                </li>
              </ul>
            </template>
            <template v-else> {{ child.label }}: {{ child.value }} </template>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Statistics',
  props: {
    statistics: {
      type: Array,
      required: true
    }
  }
}
</script>

<style module>
.statistics {
  margin-bottom: 12px;
  padding: 10px;
  background: linear-gradient(135deg, #3a3a3a, #2d2d2d);
  border-radius: 2px;
  border: 1px solid #4a4a4a;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}

.statItem {
  margin-bottom: 6px;
  color: #ffffff;
  font-size: 13px;
  line-height: 1.3;
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
  font-size: 14px;
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
