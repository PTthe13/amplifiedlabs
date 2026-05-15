# PHP image proxy with WebP negotiation

A 30-line PHP proxy that fetches images from a headless CMS (Cockpit in our case), negotiates WebP via the `Accept` header, and serves them with 30-day immutable cache headers.

Why: most headless CMSes either bill per resize or require keeping their API token in the frontend. This proxies through the server so the token stays private, while letting the browser still pick the cheapest format.

## Run

Drop `img.php` into a PHP host. Set the Cockpit base + token in your own config (originally from `cockpit.config.php`):

```php
return [
  'base'  => 'https://your-cockpit.example.com/cockpit',
  'token' => 'API-xxxxxxxx',
];
```

Then request:

```
/img.php?id=<asset-id>&w=800
```

Browser sends `Accept: image/webp`, gets WebP back. Cached one month at the edge.

## Featured on

https://amplifiedcreations.com/lab/php-image-proxy-webp
