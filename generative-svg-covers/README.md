# Generative SVG cover system

Server-side generative cover images. The geometry is deterministic from a slug + `crc32` — same input, same output, every time. No designer involved, no asset upload, no build pipeline.

We use it on [amplifiedcreations.com](https://amplifiedcreations.com) for journal and lab posts that don't have a hero image.

## How

The slug is hashed with PHP's built-in `crc32`. The hash seeds:

- Background gradient direction + colours from a small brand palette
- Number, size and offset of generative shapes
- Title position + size

Output is plain SVG with a 1-year `Cache-Control: public, immutable` header. The CDN edge does the rest.

## Run

```sh
php -S localhost:8000 cover.php
# then: http://localhost:8000/cover.php?slug=hello&title=Hello+world&w=1600&h=900
```

## Featured on

https://amplifiedcreations.com/lab/generative-svg-covers
