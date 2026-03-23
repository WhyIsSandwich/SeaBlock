---
layout: page
---

<style>
.research-map-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: calc(100dvh - var(--vp-nav-height, 64px) - 3rem);
  max-height: calc(100dvh - var(--vp-nav-height, 64px) - 3rem);
}
</style>

<div class="research-map-page">
  <ResearchMapHost :show-factoriopedia-link="true" fill-parent />
</div>
