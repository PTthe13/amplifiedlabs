<?php
/**
 * i18n URL helpers.
 *
 * URL structure:
 *   /            → English (default, no prefix)
 *   /pt/...      → Portuguese
 *   /es/...      → Spanish
 *
 * Set $_GET['lang'] from the router (or via .htaccess rewrite) before requiring this.
 *
 * link('/work')  →  /work        (en)
 * link('/work')  →  /pt/work     (pt)
 * lang()         →  current lang code: en|pt|es
 */

if (!function_exists('amp_supported_langs')) {
	function amp_supported_langs(): array { return ['en', 'pt', 'es']; }
}

if (!function_exists('lang')) {
	function lang(): string {
		static $cached = null;
		if ($cached !== null) return $cached;
		$l = (string)($_GET['lang'] ?? '');
		if ($l === '') {
			$uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
			if (preg_match('#^/(pt|es)(/|$)#', $uri ?? '', $m)) {
				$l = $m[1];
			}
		}
		if (!in_array($l, amp_supported_langs(), true)) $l = 'en';
		return $cached = $l;
	}
}

if (!function_exists('link_to')) {
	/** Prefix internal path with /pt/ or /es/ when needed. Leaves external + anchors alone. */
	function link_to(string $path): string {
		$l = lang();
		// External or mailto/tel
		if (preg_match('#^(https?:|mailto:|tel:|//)#', $path)) return $path;
		// Anchors only stay
		if (str_starts_with($path, '#')) return $path;
		// Already has lang prefix
		foreach (amp_supported_langs() as $sup) {
			if ($sup === 'en') continue;
			if (str_starts_with($path, '/' . $sup . '/') || $path === '/' . $sup) return $path;
		}
		if ($l === 'en') return $path;
		// Special case: root → /pt/ or /es/
		if ($path === '/' || $path === '') return '/' . $l . '/';
		return '/' . $l . $path;
	}
}

if (!function_exists('tr')) {
	/** Get localized value: array → pick by lang with EN fallback. String → return as-is. */
	function tr($value, ?string $lang = null) {
		if (!is_array($value)) return $value;
		$lang = $lang ?? lang();
		return $value[$lang] ?? $value['en'] ?? reset($value);
	}
}

if (!function_exists('t')) {
	/** Translate a UI string key from the shared dictionary. Falls back to EN, then to the key itself. */
	function t(string $key, ?string $lang = null): string {
		static $dict = null;
		if ($dict === null) {
			$path = __DIR__ . '/ui-strings.php';
			$dict = is_file($path) ? require $path : [];
		}
		$lang = $lang ?? lang();
		return $dict[$lang][$key] ?? $dict['en'][$key] ?? $key;
	}
}

if (!function_exists('lang_alt_links')) {
	/** Build hreflang alternate links for current page. */
	function lang_alt_links(string $base, string $pathNoLang): array {
		$out = [];
		foreach (amp_supported_langs() as $l) {
			$href = $l === 'en' ? $base . $pathNoLang : $base . '/' . $l . $pathNoLang;
			$out[] = ['lang' => $l, 'href' => $href];
		}
		$out[] = ['lang' => 'x-default', 'href' => $base . $pathNoLang];
		return $out;
	}
}
