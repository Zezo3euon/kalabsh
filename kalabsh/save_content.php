<?php
header('Content-Type: application/json');

// Basic security: Ensure this script is not accessed directly or without proper authentication in a real application.
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/assets/php/admin_auth.php';

// استرداد رمز الإدارة من الهيدرز (يدعم Authorization: Bearer أو X-ADMIN-TOKEN)
function get_admin_token_from_request(): string {
    // تفضيل هيدر Authorization إن كان متوفراً
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($auth) {
        // صيغة Bearer <token>
        if (stripos($auth, 'Bearer ') === 0) {
            return trim(substr($auth, 7));
        }
    }
    // بديل: هيدر مخصص
    $xToken = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    if ($xToken) {
        return trim($xToken);
    }
    // كملاذ أخير، السماح بتمرير الرمز عبر POST JSON في الحقول العليا (غير مفضل)
    $raw = file_get_contents('php://input');
    if ($raw) {
        $json = json_decode($raw, true);
        if (is_array($json) && isset($json['__admin_token'])) {
            return (string)$json['__admin_token'];
        }
    }
    return '';
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['status' => 'error', 'message' => 'Only POST method is accepted.']);
    exit;
}

// Allow either cookie-based developer session or static ADMIN_TOKEN header
$clientToken = get_admin_token_from_request();
if (!admin_is_authenticated()) {
    if (!$clientToken || !defined('ADMIN_TOKEN') || !hash_equals(ADMIN_TOKEN, $clientToken)) {
        http_response_code(401); // Unauthorized
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
        exit;
    }
}

$page = $_GET['page'] ?? '';

if (empty($page)) {
    http_response_code(400); // Bad Request
    echo json_encode(['status' => 'error', 'message' => 'Page parameter is missing.']);
    exit;
}

// Sanitize page name to prevent directory traversal attacks
$page = basename($page);
$allowed_pages = ['index', 'contact', 'gallery', 'pricing', 'sauna', 'shop'];

if (!in_array($page, $allowed_pages)) {
    http_response_code(400); // Bad Request
    echo json_encode(['status' => 'error', 'message' => 'Invalid page specified.']);
    exit;
}

$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400); // Bad Request
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON data received.']);
    exit;
}

// احفظ داخل مجلد المحتوى في نفس جذر المشروع
$file_path = __DIR__ . '/content/' . $page . '.json';

if (file_put_contents($file_path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
    echo json_encode(['status' => 'success', 'message' => 'Content saved successfully.']);
} else {
    http_response_code(500); // Internal Server Error
    echo json_encode(['status' => 'error', 'message' => 'Failed to write to content file.']);
}