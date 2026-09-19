# Game Feel Tuning v1

## Goals

Keep the core physics merge loop readable while making the new systems feel
useful, tense and rewarding rather than permanent or chaotic.

## Tuned values

- Overdrive activation: about 6–8 meaningful merges depending on tier and chain
- Overdrive duration: 7.2 seconds
- Overdrive extension: chain-only, roughly +0.20–0.36 seconds per chained merge
- Rescue window: 2.4 seconds
- Drop cooldown: 380 ms
- Shockwave: shorter radius, bounded horizontal push, very limited vertical launch
- Hold: one meaningful use per drop cycle; identical swaps do not consume it

## Tuning intent

Overdrive should feel like a peak, not a background state. Ordinary tier-one
merges reach it after about eight merges; strong chain play gets there sooner.

The rescue window should allow a real save without turning overflow into a long
second phase. At 2.4 seconds it remains readable on mobile but still forces an
immediate decision.

Shockwave now creates breathing room without randomly blowing up the pile. Its
impulse is clamped and its vertical component is intentionally much weaker than
the horizontal separation.

Hold remains strategically useful because it changes queue order. It resets only
after a committed drop, and an identical held/current swap is treated as a no-op
instead of consuming the action.
