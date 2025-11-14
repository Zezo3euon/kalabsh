<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/admin_auth.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
  case 'status': {
    $authed = admin_is_authenticated();
    echo json_encode(['ok' => true, 'authenticated' => $authed]);
    break;
  }
  case 'start_otp': {
    if (function_exists('admin_start_otp_ex')) {
      $res = admin_start_otp_ex();
      echo json_encode($res);
    } else {
      $ok = admin_start_otp();
      $st = admin_get_last_otp_status();
      echo json_encode(['ok' => $ok, 'channel' => ($st['channel'] ?? null), 'error' => ($st['error'] ?? null)]);
    }
    break;
  }
  case 'verify_otp': {
    $raw = file_get_contents('php://input');
    $json = $raw ? json_decode($raw, true) : [];
    $code = is_array($json) ? strval($json['code'] ?? '') : '';
    $ok = ($code !== '') ? admin_verify_otp($code) : false;
    echo json_encode(['ok' => $ok]);
    break;
  }
  case 'use_magic': {
    $token = isset($_GET['token']) ? $_GET['token'] : '';
    $ok = admin_use_magic($token);
    echo json_encode(['ok' => $ok]);
    break;
  }
  case 'test_telegram': {
    $res = admin_test_telegram();
    echo json_encode($res);
    break;
  }
  default: {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid action']);
  }
}
?>