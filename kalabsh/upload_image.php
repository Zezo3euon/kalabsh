<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/assets/php/admin_auth.php';

// استرداد رمز الإدارة من الهيدرز (نفس دالة save_content)
function get_admin_token_from_request(): string {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($auth) {
        if (stripos($auth, 'Bearer ') === 0) {
            return trim(substr($auth, 7));
        }
    }
    $xToken = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    if ($xToken) {
        return trim($xToken);
    }
    $raw = file_get_contents('php://input');
    if ($raw) {
        $json = json_decode($raw, true);
        if (is_array($json) && isset($json['__admin_token'])) {
            return (string)$json['__admin_token'];
        }
    }
    return '';
}

// السماح فقط للمطور الموثّق أو رمز الإدارة الثابت
if (!admin_is_authenticated()) {
    $clientToken = get_admin_token_from_request();
    if (!$clientToken || !defined('ADMIN_TOKEN') || !hash_equals(ADMIN_TOKEN, $clientToken)) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
        exit;
    }
}

// السماح فقط بطلبات POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Only POST is allowed']);
    exit;
}

// تحقق من وجود ملفات
if (!isset($_FILES) || empty($_FILES)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'No files uploaded']);
    exit;
}

// مجلد الحفظ (داخل معرض الصور)
$uploadDir = __DIR__ . '/assets/images/gallery/';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0775, true);
}

// أنواع مسموح بها وحجم أقصى
$allowedExts = ['jpg','jpeg','png','gif'];
$allowedMimes = ['image/jpeg','image/png','image/gif'];
$maxSize = 10 * 1024 * 1024; // 10MB

// قيود أبعاد التصميم (يمكن تعديلها لاحقًا حسب الحاجة)
$MAX_WIDTH = 1200;   // أقصى عرض للصورة النهائية
$MAX_HEIGHT = 800;   // أقصى ارتفاع للصورة النهائية

$finfo = class_exists('finfo') ? new finfo(FILEINFO_MIME_TYPE) : null;
$hasGD = function_exists('imagecreatetruecolor')
    && function_exists('imagecopyresampled')
    && function_exists('imagejpeg')
    && function_exists('imagepng')
    && function_exists('imagecreatefromjpeg')
    && function_exists('imagecreatefrompng');
$result = [];

// دعم صيغة images[]
if (isset($_FILES['images'])) {
    $files = $_FILES['images'];
    $count = is_array($files['name']) ? count($files['name']) : 0;
    for ($i = 0; $i < $count; $i++) {
        $tmpName = $files['tmp_name'][$i] ?? '';
        $origName = $files['name'][$i] ?? '';
        $size = (int)($files['size'][$i] ?? 0);
        $error = (int)($files['error'][$i] ?? UPLOAD_ERR_OK);

        if ($error !== UPLOAD_ERR_OK) { continue; }
        if (!$tmpName || !$origName) { continue; }
        if ($size <= 0 || $size > $maxSize) { continue; }

        // تحديد الامتداد و MIME
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $mime = $finfo ? ($finfo->file($tmpName) ?: '') : '';
        if (!$mime) {
            // احتياطي: استخدم نوع الملف من $_FILES أو الخرائط حسب الامتداد
            $mime = $files['type'][$i] ?? '';
            if (!$mime) {
                if ($ext === 'jpg' || $ext === 'jpeg') $mime = 'image/jpeg';
                elseif ($ext === 'png') $mime = 'image/png';
                elseif ($ext === 'gif') $mime = 'image/gif';
            }
        }
        if (!in_array($ext, $allowedExts, true)) { continue; }
        if (!in_array($mime, $allowedMimes, true)) { continue; }

        // اسم ملف آمن وفريد
        $base = preg_replace('/[^a-zA-Z0-9_\-]+/', '-', pathinfo($origName, PATHINFO_FILENAME));
        $uniq = $base . '-' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.' . $ext;
        $dest = $uploadDir . $uniq;

        if (@move_uploaded_file($tmpName, $dest)) {
            // قراءة أبعاد الصورة
            [$w, $h] = @getimagesize($dest) ?: [0,0];

            // معالجة تغيير الحجم للصور JPG/PNG فقط (نحافظ على GIF كما هو لتجنب فقدان الحركة)
            if ($hasGD && ($mime === 'image/jpeg' || $mime === 'image/png') && $w > 0 && $h > 0) {
                $scale = min($MAX_WIDTH / $w, $MAX_HEIGHT / $h, 1.0); // لا نكبر الصور الصغيرة
                if ($scale < 1.0) {
                    $newW = (int)floor($w * $scale);
                    $newH = (int)floor($h * $scale);
                    $srcImg = ($mime === 'image/jpeg') ? @imagecreatefromjpeg($dest) : @imagecreatefrompng($dest);
                    if ($srcImg) {
                        $dstImg = @imagecreatetruecolor($newW, $newH);
                        if ($mime === 'image/png') {
                            // الحفاظ على الشفافية في PNG
                            imagealphablending($dstImg, false);
                            imagesavealpha($dstImg, true);
                        }
                        if (@imagecopyresampled($dstImg, $srcImg, 0, 0, 0, 0, $newW, $newH, $w, $h)) {
                            if ($mime === 'image/jpeg') {
                                @imagejpeg($dstImg, $dest, 85); // جودة مناسبة
                            } else {
                                @imagepng($dstImg, $dest, 6);   // ضغط متوسط
                            }
                        }
                        @imagedestroy($srcImg);
                        @imagedestroy($dstImg);
                    }
                }
            } else if ($mime === 'image/gif' && $w > 0 && $h > 0) {
                // GIF: إن كانت أكبر من المقاس الأقصى نرفضها للحفاظ على الحركة بدون فقد
                if ($w > $MAX_WIDTH || $h > $MAX_HEIGHT) {
                    @unlink($dest);
                    continue; // تجاهل هذا الملف لأن أبعاده لا تناسب التصميم
                }
            }

            $publicUrl = 'assets/images/gallery/' . $uniq;
            $result[] = [ 'name' => $uniq, 'url' => $publicUrl ];
        }
    }
}

if (empty($result)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Upload failed or unsupported file types']);
    exit;
}

echo json_encode(['ok' => true, 'files' => $result], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
?>