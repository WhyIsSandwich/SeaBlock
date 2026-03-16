# Map Generation and Ocean Issues

SeaBlock starts are sensitive to scenario and generation assumptions. If your world does not behave like a SeaBlock run, validate map setup first.

## Symptoms

- Start does not resemble a small-ocean island setup.
- Expected special terrain/resources are missing.
- Early progression depends on assets that did not spawn as expected.

## Checks

1. Start a fresh map with confirmed SeaBlock preset assumptions.
2. Confirm no generation-altering mods override expected start conditions.
3. Validate map settings against known working defaults before customizing.
4. Test with default settings to isolate whether the issue is configuration-driven.

## Recovery path

- Create a baseline new game with default SeaBlock-compatible settings.
- Compare first 10 minutes against expected tutorial milestones.
- Reapply custom generation options one at a time.

<details class="details custom-block">
<summary>Map start comparison screenshot</summary>

<figure>
  <img
    src="/images/troubleshooting/map-generation/map-start__correct-vs-incorrect__v2-0__2026-03__01.webp"
    alt="Correct vs incorrect Sea Block map start comparison"
  />
  <figcaption>Expected view: valid ocean/island start versus invalid worldgen start.</figcaption>
</figure>

</details>

Capture guidance: [Wiki Screenshot Shot List](/reference/wiki-screenshot-shot-list)

## Common mistakes

- Importing settings from unrelated modpacks.
- Assuming an old map preset still matches current release behavior.
- Combining aggressive custom settings before first successful baseline run.

## Related pages

- [Troubleshooting index](/troubleshooting/)
- [Getting Started](/getting-started/)
- [Progression Milestones](/guides/progression/progression-milestones)

## Sources and attribution

Last verified: 2026-03-16

- [Sea Block FAQ (Mod Portal)](https://mods.factorio.com/mod/SeaBlock/faq)
- [Sea Block changelog (Mod Portal)](https://mods.factorio.com/mod/SeaBlock/changelog)
- [r/Seablock](https://www.reddit.com/r/Seablock/)
