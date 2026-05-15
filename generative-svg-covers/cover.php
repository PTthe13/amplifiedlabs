<?php
/**
 * Generative cover image for journal + lab entries.
 *
 * Usage: /api/cover.php?title=Foo&kind=lab&slug=bar&tags=tag1,tag2&w=1600&h=900
 *
 * Outputs an SVG cover. Deterministic per slug (same input = same output).
 * Heavy cache: 30 days immutable.
 */

header('Content-Type: image/svg+xml; charset=utf-8');
header('Cache-Control: public, max-age=2592000, immutable');

$title = trim((string)($_GET['title'] ?? 'Amplified Creations'));
$slug  = trim((string)($_GET['slug']  ?? $title));
$kind  = trim((string)($_GET['kind']  ?? 'journal'));   // journal | lab
$tags  = array_filter(array_map('trim', explode(',', (string)($_GET['tags'] ?? ''))));
$w     = max(200, min(2400, (int)($_GET['w'] ?? 1600)));
$h     = max(200, min(2400, (int)($_GET['h'] ?? 900)));

$x = fn($s) => htmlspecialchars((string)$s, ENT_XML1 | ENT_QUOTES, 'UTF-8');

// Deterministic seed from slug
$seed   = crc32($slug);
$hue    = ($kind === 'lab') ? 200 + ($seed % 60) : 20 + ($seed % 40);  // lab=cool, journal=warm
$accent = ($kind === 'lab') ? '#7fa2af' : '#f16622';
$rotate = ($seed % 30) - 15;

// Title wrap
$maxChars = 26;
$words = explode(' ', $title);
$lines = [''];
foreach ($words as $w_) {
	$lastIdx = count($lines) - 1;
	if (mb_strlen($lines[$lastIdx] . ($lines[$lastIdx] ? ' ' : '') . $w_) <= $maxChars) {
		$lines[$lastIdx] .= ($lines[$lastIdx] ? ' ' : '') . $w_;
	} else {
		$lines[] = $w_;
	}
}
$lines = array_slice($lines, 0, 4);
$lineH = (int)($h * 0.10);
$baseY = (int)($h * 0.62) - (count($lines) - 1) * $lineH;

// Grid dots
$cols = 24;
$rows = (int)(($h / $w) * $cols);
$dotR = max(1, (int)($w / 600));
$dots = '';
for ($r = 0; $r < $rows; $r++) {
	for ($c = 0; $c < $cols; $c++) {
		$noise = (($seed >> ($r % 8)) ^ ($c * 13 + $r * 17)) & 0xff;
		$opacity = ($noise % 60) / 200;          // 0–0.3
		$cx = ($c + 0.5) * ($w / $cols);
		$cy = ($r + 0.5) * ($h / $rows);
		$dots .= sprintf('<circle cx="%.1f" cy="%.1f" r="%d" fill="%s" opacity="%.2f"/>', $cx, $cy, $dotR, $accent, $opacity);
	}
}

// Big shape — deterministic geometric overlay
$shapeCx = $w * (0.6 + (($seed % 100) / 500));
$shapeCy = $h * (0.35 + (($seed % 70) / 400));
$shapeR  = (int)($w * (0.18 + (($seed % 40) / 200)));

// Tag pills bottom-right
$tagSvg = '';
$tagX = $w - 40;
$tagY = $h - 40;
foreach (array_reverse(array_slice($tags, 0, 3)) as $t) {
	$len = mb_strlen($t);
	$pad = 14;
	$tw  = $len * 9 + $pad * 2;
	$tagX -= ($tw + 8);
	$tagSvg .= sprintf(
		'<g transform="translate(%d,%d)"><rect x="0" y="-20" rx="14" ry="14" width="%d" height="28" fill="none" stroke="%s" stroke-width="1" opacity="0.7"/><text x="%d" y="-2" font-family="JetBrains Mono, monospace" font-size="11" fill="%s" letter-spacing="1.5" text-anchor="middle">%s</text></g>',
		$tagX, $tagY, $tw, $accent, (int)($tw / 2), $accent, $x(strtoupper($t))
	);
}
?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 <?= $w ?> <?= $h ?>" width="<?= $w ?>" height="<?= $h ?>" preserveAspectRatio="xMidYMid slice">
	<defs>
		<radialGradient id="bg" cx="30%" cy="40%" r="80%">
			<?php if ($kind === 'lab'): ?>
			<stop offset="0%" stop-color="#1a3d5a" stop-opacity="1"/>
			<stop offset="60%" stop-color="#0a1822" stop-opacity="1"/>
			<stop offset="100%" stop-color="#050a10" stop-opacity="1"/>
			<?php else: ?>
			<stop offset="0%" stop-color="#2a1f15" stop-opacity="1"/>
			<stop offset="60%" stop-color="#15100a" stop-opacity="1"/>
			<stop offset="100%" stop-color="#0a0705" stop-opacity="1"/>
			<?php endif; ?>
		</radialGradient>
		<radialGradient id="accent-glow" cx="75%" cy="65%" r="45%">
			<stop offset="0%" stop-color="<?= $accent ?>" stop-opacity="0.25"/>
			<stop offset="100%" stop-color="<?= $accent ?>" stop-opacity="0"/>
		</radialGradient>
	</defs>

	<rect width="<?= $w ?>" height="<?= $h ?>" fill="url(#bg)"/>
	<rect width="<?= $w ?>" height="<?= $h ?>" fill="url(#accent-glow)"/>

	<!-- Geometric shape -->
	<g transform="rotate(<?= $rotate ?> <?= (int)$shapeCx ?> <?= (int)$shapeCy ?>)" opacity="0.18">
		<circle cx="<?= (int)$shapeCx ?>" cy="<?= (int)$shapeCy ?>" r="<?= $shapeR ?>" fill="none" stroke="<?= $accent ?>" stroke-width="<?= max(1, (int)($w / 400)) ?>"/>
		<circle cx="<?= (int)$shapeCx ?>" cy="<?= (int)$shapeCy ?>" r="<?= (int)($shapeR * 0.66) ?>" fill="none" stroke="<?= $accent ?>" stroke-width="<?= max(1, (int)($w / 600)) ?>" stroke-dasharray="<?= max(2, (int)($w/300)) ?>,<?= max(4, (int)($w/200)) ?>"/>
		<circle cx="<?= (int)$shapeCx ?>" cy="<?= (int)$shapeCy ?>" r="<?= (int)($shapeR * 0.33) ?>" fill="<?= $accent ?>" opacity="0.4"/>
	</g>

	<!-- Dot grid -->
	<?= $dots ?>

	<!-- Top-left crosshair + eyebrow -->
	<g stroke="<?= $accent ?>" stroke-width="1" opacity="0.7">
		<line x1="<?= (int)($w * 0.05) ?>" y1="<?= (int)($h * 0.10) ?>" x2="<?= (int)($w * 0.05) ?>" y2="<?= (int)($h * 0.14) ?>"/>
		<line x1="<?= (int)($w * 0.05) ?>" y1="<?= (int)($h * 0.10) ?>" x2="<?= (int)($w * 0.07) ?>" y2="<?= (int)($h * 0.10) ?>"/>
	</g>
	<text x="<?= (int)($w * 0.05) ?>" y="<?= (int)($h * 0.19) ?>" font-family="JetBrains Mono, monospace" font-size="<?= (int)($w / 100) ?>" letter-spacing="3" fill="<?= $accent ?>" opacity="0.85">
		— <?= $x(strtoupper($kind)) ?>
	</text>

	<!-- Title -->
	<?php foreach ($lines as $i => $line): ?>
	<text x="<?= (int)($w * 0.05) ?>" y="<?= $baseY + $i * $lineH ?>" font-family="Instrument Serif, serif" font-size="<?= (int)($h * 0.10) ?>" font-style="italic" fill="#e8edf2" letter-spacing="-2">
		<?= $x($line) ?>
	</text>
	<?php endforeach; ?>

	<!-- Tags -->
	<?= $tagSvg ?>

	<!-- Bottom-left mark -->
	<text x="<?= (int)($w * 0.05) ?>" y="<?= $h - (int)($h * 0.04) ?>" font-family="JetBrains Mono, monospace" font-size="<?= (int)($w / 130) ?>" letter-spacing="3" fill="<?= $accent ?>" opacity="0.6">
		AMPLIFIED CREATIONS
	</text>
</svg>
