<?php
// Offline License Maker (run on a machine not connected to the internet)
// Usage:
//   php tools/license_maker.php <device_fingerprint_hex> [days]
//   php tools/license_maker.php --pubout    # outputs public key (PEM) from private key
// Outputs a license string: base64url(payloadJSON) . "." . base64url(signature)
//
// IMPORTANT:
// - Use your OWN RSA 2048 private key (PKCS#1 "RSA PRIVATE KEY" or PKCS#8 "PRIVATE KEY").
// - You can place the private key in tools/issuer_private.pem to avoid embedding it.
// - Copy the corresponding public key (PEM, SPKI) to: assets/php/license_issuer_public.pem on the server.
// - Keep the private key strictly offline.

// Try loading a private key from tools/issuer_private.pem; fallback to embedded placeholder.
$DEFAULT_PRIV_PATH = __DIR__ . '/issuer_private.pem';
$PRIVATE_KEY_PEM = null;
if (is_file($DEFAULT_PRIV_PATH)) {
    $PRIVATE_KEY_PEM = @file_get_contents($DEFAULT_PRIV_PATH);
}
if (!$PRIVATE_KEY_PEM) {
    // ----- BEGIN: REPLACE WITH YOUR RSA/PKCS8 PRIVATE KEY PEM -----
    $PRIVATE_KEY_PEM = <<<PEM
-----BEGIN PRIVATE KEY-----
REPLACE_WITH_YOUR_PKCS8_OR_PKCS1_PRIVATE_KEY
-----END PRIVATE KEY-----
PEM;
    // ----- END: REPLACE WITH YOUR RSA/PKCS8 PRIVATE KEY PEM -----
}

function b64url_encode(string $s): string {
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function canonical_payload(string $fingerprintHex, int $days): string {
    $days = max(1, $days);
    $exp = time() + ($days * 24 * 60 * 60);
    $payload = [
        'device_fingerprint' => $fingerprintHex,
        'exp' => $exp,
        'issued_at' => time(),
        'license_id' => bin2hex(random_bytes(8)),
    ];
    // Produce compact JSON (no spaces) for consistent signing
    return json_encode($payload, JSON_UNESCAPED_SLASHES);
}

function make_license(string $fingerprintHex, int $days, string $privPem): string {
    $payload = canonical_payload($fingerprintHex, $days);
    $priv = openssl_pkey_get_private($privPem);
    if ($priv === false) { fwrite(STDERR, "Invalid private key.\n"); exit(2); }
    $sig = '';
    $ok = openssl_sign($payload, $sig, $priv, OPENSSL_ALGO_SHA256);
    if (!$ok) { fwrite(STDERR, "Signing failed.\n"); exit(3); }
    return b64url_encode($payload) . '.' . b64url_encode($sig);
}

// Entry
if ($argc < 2) {
    fwrite(STDERR, "Usage:\n  php tools/license_maker.php <device_fingerprint_hex> [days]\n  php tools/license_maker.php --pubout\n");
    exit(1);
}
// Mode selection
$arg1 = trim($argv[1]);
if (in_array($arg1, ['--pubout','-pub','pub'], true)) {
    $priv = openssl_pkey_get_private($PRIVATE_KEY_PEM);
    if ($priv === false) { fwrite(STDERR, "Invalid private key.\n"); exit(2); }
    $details = openssl_pkey_get_details($priv);
    if ($details === false || empty($details['key'])) { fwrite(STDERR, "Unable to extract public key.\n"); exit(3); }
    echo $details['key'], "\n";
    exit(0);
}

$fp = $arg1;
if ($fp === '') { fwrite(STDERR, "Empty fingerprint.\n"); exit(1); }
// Basic hex validation (expected SHA-256 hex): 64 hex chars; allow other lengths but warn
if (!preg_match('/^[a-f0-9]+$/i', $fp)) {
    fwrite(STDERR, "Warning: fingerprint contains non-hex characters.\n");
}
$days = 30;
if ($argc >= 3) {
    $daysArg = intval($argv[2]);
    if ($daysArg > 0) { $days = $daysArg; }
}
echo make_license($fp, $days, $PRIVATE_KEY_PEM), "\n";
?>