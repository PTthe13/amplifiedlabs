# Responsive Type Scale (clamp)

A fluid modular type scale that resizes between two viewport widths using CSS `clamp()`. Pick a base font-size, pick a scale ratio (minor 2nd through golden), get a copy-paste ladder for `h1`–`h6` + body.

Single-file. No framework. No media queries needed.

## Why

Two ways most teams handle responsive type are bad:

1. Set body to a fixed `16px` and forget it — heads up against the wall on 4K screens.
2. Stack 5 media queries per heading — your CSS file doubles in size and the gaps between breakpoints look like a staircase.

`clamp(min, slope·vw + intercept, max)` fluid-resizes type with two values. This tool computes the slope and intercept correctly so that the type hits *exactly* your min size at the smallest viewport and *exactly* your max size at the largest one.

## How

- Base font-size at two viewport extremes
- Scale ratio applied across 7 levels (body + h6→h1)
- `clamp()` slope/intercept solved per level
- Outputs CSS custom properties + utility classes, and a Tailwind `fontSize` config block

## Run

```sh
open index.html
```

## Featured on

https://amplifiedcreations.com/lab/responsive-type-scale
