# Game Feel Tuning v1

## Goals

Make the new systems feel useful without letting them dominate the core physics merge loop.

## Tuned values

- Overdrive activation target: roughly 6–7 meaningful merges in a typical midgame sequence
- Overdrive duration: 7.5 seconds
- Overdrive merge extension: +0.24 seconds per merge, capped by the normal duration horizon
- Rescue window: 2.2 seconds
- Shockwave: stronger horizontal separation, reduced upward launch
- Hold: one use per drop cycle; swapping an identical held/current monster is blocked

## Why

The previous Overdrive formula activated in about four merges in representative sequences, making the bonus feel close to permanent. The new gain curve keeps chain play rewarding while making the peak rarer.

The previous 3 second rescue window allowed too many extra drops at the existing 430 ms cooldown. 2.2 seconds keeps a real recovery opportunity without turning overflow into a long grace phase.

Shockwave now creates visible breathing room while limiting vertical velocity so successful merges do not randomly throw the pile toward the danger line.

Hold remains strategically strong because it changes queue order, but the UI now highlights only meaningful swap states and prevents consuming the action on an identical swap.
