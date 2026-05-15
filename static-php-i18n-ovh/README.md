# Static-PHP i18n at OVH scale

An i18n stack that works on cheap shared hosting where Apache's mod_rewrite `[QSA]` flag mysteriously drops query strings (yes, really — OVH).

## The trick

Two functions: `lang()` and `t()`. `lang()` figures out the requested language by:

1. Reading `?lang=` from the query string
2. Falling back to URL path parsing (`/pt/...`, `/es/...`)
3. Defaulting to English

`t(key)` reads a shared dictionary (`ui-strings.php`) and returns the right translation. Falls back to the EN string, then to the key itself.

On the client, a tiny `i18n.js` rewrites `<a href="/foo">` to `<a href="/pt/foo">` after page load when `lang() === 'pt'`. Keeps links sane without forcing PHP to generate them dynamically everywhere.

No frameworks. No build step. Works on any PHP 7.4+ host that has `mb_*` extensions enabled.

## Files

- `lang.php` — server helpers
- `ui-strings.php` — EN/PT/ES dict, one big array

## Featured on

https://amplifiedcreations.com/lab/static-php-i18n-ovh
