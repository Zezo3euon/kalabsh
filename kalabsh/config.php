<?php
// إعداد رمز الإدارة (يجب تغييره قبل النشر)
// يمكن تحميله من متغير بيئة ADMIN_TOKEN إن كان متوفراً
$envToken = getenv('ADMIN_TOKEN');
if ($envToken && is_string($envToken) && strlen($envToken) > 0) {
    define('ADMIN_TOKEN', $envToken);
} else {
    // غيّر هذه القيمة إلى رمز قوي وسري
    define('ADMIN_TOKEN', 'CHANGE_THIS_ADMIN_TOKEN');
}

// إعدادات التحقق عبر الرسائل (OTP)
// ضع بيانات تيليجرام/تويليو هنا حسب القناة المرغوبة لإرسال الرمز
define('ADMIN_PHONE', getenv('ADMIN_PHONE') ?: '+201014442427'); // رقم مطوّر الموقع بصيغة دولية
define('TWILIO_SID', getenv('TWILIO_SID') ?: '');
define('TWILIO_TOKEN', getenv('TWILIO_TOKEN') ?: '');
define('TWILIO_FROM', getenv('TWILIO_FROM') ?: '');
// إعدادات تيليجرام: توكن البوت ومعرّف المحادثة (chat_id)
define('TELEGRAM_BOT_TOKEN', getenv('TELEGRAM_BOT_TOKEN') ?: '7802274037:AAHusvmYbR2IKLYDmcwEVC7RCYLyG_SB7mQ');
define('TELEGRAM_CHAT_ID', getenv('TELEGRAM_CHAT_ID') ?: '1251362028');