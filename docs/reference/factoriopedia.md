---
layout: page
---

<style>
/* Limit page-level styling so it does not leak into Factoriopedia internals */
.factoriopedia-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  box-sizing: border-box;
}

@media (min-width: 769px) {
  .factoriopedia-page {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: calc(100dvh - var(--vp-nav-height, 64px) - 2rem);
    max-height: calc(100dvh - var(--vp-nav-height, 64px) - 2rem);
    overflow: hidden;
  }
}

@media (max-width: 768px) {
  .factoriopedia-page {
    display: flex;
    flex-direction: column;
    min-height: calc(100dvh - var(--vp-nav-height, 64px));
    overflow: visible;
  }
}
</style>

<div class="factoriopedia-page">
  <Factoriopedia />
</div>
