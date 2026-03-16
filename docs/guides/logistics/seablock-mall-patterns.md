# SeaBlock Mall Patterns

A Sea Block mall is the factory that builds your factory. This page focuses on maintainable mall architecture for long runs.

## Read this if...

- You are hand-crafting too many buildings and intermediates.
- Your base is crowded with ad-hoc "temporary" assemblers.
- You want a mall that survives multiple progression transitions.

## Mall goals by stage

| Stage | Priority outputs                                       | Notes                                                                                  |
| ----- | ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Early | belts, inserters, pipes, power basics                  | Keep compact and close to bootstrap resources                                          |
| Mid   | fluid handling, metallurgy support, logistics upgrades | Split high-volume outputs from specialty items potentially even handcrafting as needed |
| Late  | modules, beacon support, rail/block infrastructure     | Everything a megabase needs                                                            |

## Recommended pattern

1. Add based on usage
2. Don't worry about perfect routing
3. Keep low-throughput specialty items in compact direct-insert cells.

## Common mistakes

- Building one giant undifferentiated mall with no product grouping.
- Feeding the mall from unstable early chains.
- Letting mall demand starve science chains during expansion spikes or just making things you don't need.

## Related pages

- [Mid Game Guide](/guides/mid-game)
- [Late Game Guide](/guides/late-game)
- [Rails and City Blocks](/guides/logistics/rails-and-city-blocks)

## Sources and attribution

Last verified: 2026-03-16

- SeaBlock in-repo documentation and linked project pages.
