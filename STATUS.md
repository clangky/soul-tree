# Soul Tree — Status

*Updated: 2026-09-18*

## Current state

Soul Tree is a complete first experiential prototype and is publicly playable
at <https://clangky.github.io/soul-tree/>. Its source is publicly available at
<https://github.com/clangky/soul-tree>. It simulates a large population of souls
moving through lives, inherited trajectories, choice, awakening, collective
coherence, and resistance. Four camera aspects reveal the same system as Tree,
Ouroboros, Mandala, or an interior view.

The simulation supports a logical population up to one million souls while
rendering a bounded GPU particle population (180,000 on desktop and 90,000 on
mobile). Controls expose population, awakening, choice, resistance, cycle
speed, camera aspect, pause, pulse, force application, and reset.

## Validation

- `npm run build` passes.
- `npm audit` reports no known vulnerabilities.
- A repository secret scan found no credentials or private material.
- Public GitHub visibility, default branch `main`, and HTTP access were
  verified. The initial public release was commit `06d8966`.
- GitHub Pages deploys automatically from `main` through
  `.github/workflows/deploy-pages.yml`. The first Actions build and deployment
  passed, and the live HTML, JavaScript, and CSS endpoints returned HTTP 200.
- Automated visual browser inspection could not be completed because the host's
  managed browser timed out and direct headless Chrome did not produce a
  screenshot. This is an environment limitation, not a confirmed application
  failure.

## Unresolved

- The prototype still needs its first deliberate manual visual and performance
  review on both desktop and mobile hardware.
- The million-soul logical-population setting and all four aspects have not yet
  been exercised in a real browser during this handoff.
- The repository has no license. Public visibility does not grant a reuse
  license; Merl should choose one explicitly before inviting contributions or
  reuse.

## Next step

Follow `NEXT-SESSION.md`: open the live experience, validate interaction and
frame rate, capture the first representative visuals, and then decide whether
the next iteration should emphasize local-neighbor awakening, richer
resistance, or presentation polish.
