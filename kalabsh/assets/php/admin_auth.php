<?php
// Simple admin OTP authentication helper

function admin_token_file_path(): string {
    return __DIR__ . '/admin_tokens.json';
}

function admin_load_token(): ?array {
    $file = admin_token_file_path();
    if (!file_exists($file)) { return null; }
    $raw = @file_get_contents($file);
    if ($raw === false) { return null; }
    $data = @json_decode($raw, true);
    if (!is_array($data)) { return null; }
    return $data;
}

function admin_save_token(string $token, int $expires): bool {
    $file = admin_token_file_path();
    $payload = json_encode([ 'token' => $token, 'expires' => $expires ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return @file_put_contents($file, $payload) !== false;
}

function admin_is_authenticated(): bool {
    // Persistent cookie-based auth valid for one month
    if (isset($_COOKIE['ADMIN_ACCESS'])) {
        $current = admin_load_token();
        if ($current && isset($current['token'], $current['expires'])) {
            if (hash_equals($current['token'], $_COOKIE['ADMIN_ACCESS']) && time() < (int)$current['expires']) {
                return true;
            }
        }
    }
    return false;
}

function admin_start_otp(): bool {
    if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }
    $code = strval(random_int(100000, 999999));
    $_SESSION['admin_pending_otp'] = [
        'code' => $code,
        'created' => time(),
    ];
    return send_otp_sms($code);
}

// حالة آخر إرسال OTP (قناة/خطأ)
function admin_get_last_otp_status(): array {
    $statusFile = __DIR__ . '/otp_status.json';
    if (!file_exists($statusFile)) { return [ 'channel' => null, 'error' => null ]; }
    $raw = @file_get_contents($statusFile);
    $data = @json_decode($raw, true);
    return is_array($data) ? $data : [ 'channel' => null, 'error' => null ];
}

function admin_set_last_otp_status(?string $channel, ?string $error): void {
    $statusFile = __DIR__ . '/otp_status.json';
    $payload = json_encode([ 'channel' => $channel, 'error' => $error ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    @file_put_contents($statusFile, $payload);
}

function admin_start_otp_ex(): array {
    if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }
    $code = strval(random_int(100000, 999999));
    $_SESSION['admin_pending_otp'] = [ 'code' => $code, 'created' => time() ];
    $ok = send_otp_sms($code);
    $st = admin_get_last_otp_status();
    return [ 'ok' => $ok, 'channel' => ($st['channel'] ?? null), 'error' => ($st['error'] ?? null) ];
}

function admin_verify_otp(string $code): bool {
    if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }
    $pending = $_SESSION['admin_pending_otp'] ?? null;
    if (!$pending || !isset($pending['code'], $pending['created'])) { return false; }
    // OTP valid for 10 minutes
    if ((time() - (int)$pending['created']) > 600) { unset($_SESSION['admin_pending_otp']); return false; }
    if (!hash_equals($pending['code'], trim($code))) { return false; }
    unset($_SESSION['admin_pending_otp']);

    // Issue 30-day persistent access token
    $token = bin2hex(random_bytes(16));
    $expires = time() + (30 * 24 * 60 * 60);
    if (!admin_save_token($token, $expires)) { return false; }

    // HttpOnly cookie, 30 days
    setcookie('ADMIN_ACCESS', $token, [
        'expires' => $expires,
        'path' => '/',
        'secure' => false, // set true if using HTTPS
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    return true;
}

// --- Magic Link helpers (temporary, one-time access tokens) ---
function admin_magic_file_path(): string {
    return __DIR__ . '/admin_magic.json';
}

function admin_magic_load(): array {
    $file = admin_magic_file_path();
    if (!file_exists($file)) { return []; }
    $raw = @file_get_contents($file);
    if ($raw === false) { return []; }
    $data = @json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function admin_magic_save(array $map): bool {
    $file = admin_magic_file_path();
    $payload = json_encode($map, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return @file_put_contents($file, $payload) !== false;
}

function admin_create_magic(int $ttlSeconds = 600): ?string {
    // Create a one-time token valid for $ttlSeconds (default 10 minutes)
    $token = bin2hex(random_bytes(16));
    $expires = time() + max(60, $ttlSeconds);
    $map = admin_magic_load();
    $map[$token] = $expires;
    if (!admin_magic_save($map)) { return null; }
    return $token;
}

function admin_use_magic(string $token): bool {
    // Consume a one-time token; if valid, issue 30-day admin access
    if (!$token) { return false; }
    $map = admin_magic_load();
    if (!isset($map[$token])) { return false; }
    $expires = (int)$map[$token];
    // Remove token regardless to ensure one-time use
    unset($map[$token]);
    admin_magic_save($map);
    if (time() > $expires) { return false; }

    // Issue 30-day persistent access token (reuse logic from admin_verify_otp)
    $persistToken = bin2hex(random_bytes(16));
    $persistExpires = time() + (30 * 24 * 60 * 60);
    if (!admin_save_token($persistToken, $persistExpires)) { return false; }
    setcookie('ADMIN_ACCESS', $persistToken, [
        'expires' => $persistExpires,
        'path' => '/',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    return true;
}

function send_otp_sms(string $code): bool {
    // Prefer Telegram if configured; otherwise use Twilio; else write to debug log
    $tgBot = defined('TELEGRAM_BOT_TOKEN') ? TELEGRAM_BOT_TOKEN : '';
    $tgChat = defined('TELEGRAM_CHAT_ID') ? TELEGRAM_CHAT_ID : '';
    $body = "رمز الدخول إلى لوحة الإدارة: $code";

    if ($tgBot && $tgChat) {
        $tgUrl = "https://api.telegram.org/bot{$tgBot}/sendMessage";
        $payload = http_build_query([
            'chat_id' => $tgChat,
            'text' => $body,
            'disable_web_page_preview' => true,
            'parse_mode' => 'HTML',
        ]);
        if (function_exists('curl_init')) {
            $ch = curl_init($tgUrl);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            $resp = curl_exec($ch);
            $err = curl_error($ch);
            $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($err) { error_log('Telegram error: ' . $err); }
            if ($status >= 200 && $status < 300) { admin_set_last_otp_status('telegram', null); return true; }
            admin_set_last_otp_status('telegram', 'HTTP ' . $status . ' ' . ($err ?: '')); 
        } else {
            $ctx = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => "Content-Type: application/x-www-form-urlencoded",
                    'content' => $payload,
                    'ignore_errors' => true,
                ]
            ]);
            $resp = @file_get_contents($tgUrl, false, $ctx);
            if ($resp !== false) { admin_set_last_otp_status('telegram', null); return true; }
            admin_set_last_otp_status('telegram', 'stream error');
        }
    }

    // Twilio fallback if configured
    $sid = defined('TWILIO_SID') ? TWILIO_SID : '';
    $token = defined('TWILIO_TOKEN') ? TWILIO_TOKEN : '';
    $from = defined('TWILIO_FROM') ? TWILIO_FROM : '';
    $to = defined('ADMIN_PHONE') ? ADMIN_PHONE : '';
    if ($sid && $token && $from && $to) {
        $url = "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";
        $postFields = http_build_query([
            'To' => $to,
            'From' => $from,
            'Body' => $body,
        ]);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $sid . ':' . $token);
        $resp = curl_exec($ch);
        $err = curl_error($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($err) { error_log('Twilio error: ' . $err); }
        if ($status >= 200 && $status < 300) { admin_set_last_otp_status('twilio', null); return true; }
        admin_set_last_otp_status('twilio', 'HTTP ' . $status . ' ' . ($err ?: '')); 
    }

    // Fallback: write OTP to debug log
    $logFile = __DIR__ . '/otp_debug.log';
    @file_put_contents($logFile, date('c') . " OTP: " . $code . "\n", FILE_APPEND);
    error_log('Admin OTP (debug): ' . $code);
    admin_set_last_otp_status('debug', 'No configured channel');
    return false;
}

// اختبار إرسال رسالة تيليجرام دون ربطها بجلسة OTP
function admin_test_telegram(): array {
    $tgBot = defined('TELEGRAM_BOT_TOKEN') ? TELEGRAM_BOT_TOKEN : '';
    $tgChat = defined('TELEGRAM_CHAT_ID') ? TELEGRAM_CHAT_ID : '';
    if (!$tgBot || !$tgChat) { return [ 'ok' => false, 'error' => 'TELEGRAM_BOT_TOKEN/CHAT_ID غير مضبوطين' ]; }
    $tgUrl = "https://api.telegram.org/bot{$tgBot}/sendMessage";
    $payload = http_build_query([
        'chat_id' => $tgChat,
        'text' => 'Kalabsh OTP test message',
        'disable_web_page_preview' => true,
        'parse_mode' => 'HTML',
    ]);
    $status = 0; $err = '';
    if (function_exists('curl_init')) {
        $ch = curl_init($tgUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $resp = curl_exec($ch);
        $err = curl_error($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($status >= 200 && $status < 300) { return [ 'ok' => true ]; }
        return [ 'ok' => false, 'error' => 'HTTP ' . $status . ' ' . ($err ?: '') ];
    }
    $ctx = stream_context_create([
        'http' => [ 'method' => 'POST', 'header' => "Content-Type: application/x-www-form-urlencoded", 'content' => $payload, 'ignore_errors' => true ]
    ]);
    $resp = @file_get_contents($tgUrl, false, $ctx);
    if ($resp !== false) { return [ 'ok' => true ]; }
    return [ 'ok' => false, 'error' => 'stream error' ];
}

// --- License-based activation (offline issuer signing) ---
function b64url_decode(string $s): string {
    $padded = str_pad(strtr($s, '-_', '+/'), strlen($s) + (4 - (strlen($s) % 4)) % 4, '=', STR_PAD_RIGHT);
    $decoded = base64_decode($padded, true);
    return $decoded === false ? '' : $decoded;
}

function admin_verify_license_signature(string $payloadBytes, string $signatureBytes): bool {
    $pubPath = __DIR__ . '/license_issuer_public.pem';
    if (!file_exists($pubPath)) { return false; }
    $pub = @file_get_contents($pubPath);
    if ($pub === false || !$pub) { return false; }
    $key = @openssl_pkey_get_public($pub);
    if ($key === false) { return false; }
    $ok = openssl_verify($payloadBytes, $signatureBytes, $key, OPENSSL_ALGO_SHA256);
    return $ok === 1;
}

function admin_activate_license(string $license, string $deviceFingerprint): array {
    // License format: base64url(payloadJSON) . '.' . base64url(signature)
    $license = trim($license);
    $deviceFingerprint = trim($deviceFingerprint);
    if ($license === '' || $deviceFingerprint === '') {
        return [ 'ok' => false, 'error' => 'بيانات ناقصة' ];
    }
    $parts = explode('.', $license);
    if (count($parts) !== 2) {
        return [ 'ok' => false, 'error' => 'صيغة المفتاح غير صحيحة' ];
    }
    [$p64, $s64] = $parts;
    $payloadBytes = b64url_decode($p64);
    $signatureBytes = b64url_decode($s64);
    if ($payloadBytes === '' || $signatureBytes === '') {
        return [ 'ok' => false, 'error' => 'فك ترميز المفتاح فشل' ];
    }
    if (!admin_verify_license_signature($payloadBytes, $signatureBytes)) {
        return [ 'ok' => false, 'error' => 'توقيع غير صالح' ];
    }
    $payload = @json_decode($payloadBytes, true);
    if (!is_array($payload)) {
        return [ 'ok' => false, 'error' => 'حمولة المفتاح غير صالحة' ];
    }
    $exp = (int)($payload['exp'] ?? 0);
    $dfp = strval($payload['device_fingerprint'] ?? '');
    if ($exp <= time()) {
        return [ 'ok' => false, 'error' => 'انتهت صلاحية المفتاح' ];
    }
    if ($dfp === '' || !hash_equals($dfp, $deviceFingerprint)) {
        return [ 'ok' => false, 'error' => 'المفتاح غير مخصص لهذا الجهاز' ];
    }

    // Issue persistent access token until license expiry (max 30 days)
    $now = time();
    $max = $now + (30 * 24 * 60 * 60);
    $persistExpires = min($exp, $max);
    $persistToken = bin2hex(random_bytes(16));
    if (!admin_save_token($persistToken, $persistExpires)) {
        return [ 'ok' => false, 'error' => 'تعذّر حفظ جلسة الدخول' ];
    }
    setcookie('ADMIN_ACCESS', $persistToken, [
        'expires' => $persistExpires,
        'path' => '/',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    return [ 'ok' => true, 'expires' => $persistExpires ];
}

// Handle direct POST requests to this file for license activation
if (!defined('KALABSH_ADMIN_AUTH_ROUTED')) {
    $isDirect = isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__;
    if ($isDirect && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';
        if ($action === 'activate_license') {
            $license = $_POST['license'] ?? '';
            $dfp = $_POST['device_fingerprint'] ?? '';
            $result = admin_activate_license($license, $dfp);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
        // Unknown action; return error
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([ 'ok' => false, 'error' => 'إجراء غير معروف' ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}