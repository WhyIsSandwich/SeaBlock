<template>
  <div class="rich-text-example">
    <h3>Factorio Rich Text Examples</h3>

    <div class="example">
      <h4>Basic Item Reference:</h4>
      <FactorioRichText :text="'This is a [item=iron-plate] in the text'" />
    </div>

    <div class="example">
      <h4>Recipe Reference:</h4>
      <FactorioRichText :text="'You can craft [recipe=iron-plate] to get iron plates'" />
    </div>

    <div class="example">
      <h4>Fluid Reference:</h4>
      <FactorioRichText :text="'Use [fluid=water] for cooling systems'" />
    </div>

    <div class="example">
      <h4>Colored Text:</h4>
      <FactorioRichText
        :text="'This is [color=red]red text[/color] and [color=#7ac1de]blue text[.color]'"
      />
    </div>

    <div class="example">
      <h4>Bold and Italic:</h4>
      <FactorioRichText :text="'This is [bold]bold text[/bold] and [italic]italic text[/italic]'" />
    </div>

    <div class="example">
      <h4>Complex Example:</h4>
      <FactorioRichText
        :text="'To make [item=steel-plate], you need [recipe=steel-plate] which requires [item=iron-plate] and [fluid=water]'"
      />
    </div>

    <div class="example">
      <h4>Inline Sprite and Tooltip:</h4>
      <FactorioRichText
        :text="'[img=utility.warning_icon] [tooltip=Hover for locale tooltip,item-name.iron-plate]'"
      />
    </div>

    <div class="example">
      <h4>Space Age Tags:</h4>
      <FactorioRichText :text="'Planet [planet=gleba], location [space-location=nauvis], [space-age]'" />
    </div>

    <div class="example">
      <h4>Strict-Mode Malformed Tag:</h4>
      <FactorioRichText :text="'Invalid close [color=green]text[/font] keeps raw tag'" />
    </div>
  </div>
</template>

<script setup>
import FactorioRichText from './FactorioRichText.vue'
</script>

<style scoped>
.rich-text-example {
  padding: 20px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  margin: 20px 0;
}

.example {
  margin: 15px 0;
  padding: 10px;
  background: #222;
  border-radius: 2px;
}

.example h4 {
  margin: 0 0 8px 0;
  color: #ffcc66;
  font-size: 14px;
}

.example :deep(.factorio-item),
.example :deep(.factorio-recipe),
.example :deep(.factorio-fluid) {
  color: #ffcc66;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 1px dotted #ffcc66;
  transition: all 0.2s ease;
}

.example :deep(.factorio-item:hover),
.example :deep(.factorio-recipe:hover),
.example :deep(.factorio-fluid:hover) {
  color: #ffffff;
  border-bottom-color: #ffffff;
  background-color: rgba(255, 204, 102, 0.1);
  padding: 1px 2px;
  border-radius: 2px;
}
</style>
