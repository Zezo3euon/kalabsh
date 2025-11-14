<?php
// لوحة الإدارة بدون OTP
session_start();
require_once __DIR__ . '/config.php';

// إلغاء بوابة OTP: عرض لوحة الإدارة دائمًا
$authed = true;
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لوحة التحكم - صالون كالابش</title>
    <link rel="stylesheet" href="assets/css/styles.css">
    <link rel="stylesheet" href="assets/css/admin.css">
</head>
<body>
  <header class="site-header">
    <a href="index.html" class="brand">
      <img src="assets/images/gallery/logo.png" alt="كلبش" class="logo">
      <span class="brand-name">كلبش</span>
    </a>
    <button class="nav-toggle" aria-label="فتح القائمة"></button>
    <form class="nav-search" role="search" aria-label="بحث الموقع">
      <input type="search" id="siteSearch" name="q" placeholder="ابحث عن منتج أو جهاز..." autocomplete="off" aria-label="اكتب نص البحث">
      <button type="submit" class="btn search-btn" aria-label="تنفيذ البحث">بحث</button>
    </form>
    <nav class="site-nav">
      <a href="index.html">الرئيسية</a>
      <a href="pricing.html">عروض الأسعار</a>
      <a href="gallery.html">المعرض</a>
      <a href="shop.html">المتجر</a>
      <a href="sauna.html">الساونا</a>
      <a href="contact.html">اتصل بنا</a>
      <a href="admin.php" class="admin-link active">لوحة التحكم</a>
    </nav>
  </header>
    <div class="admin-container">
        <div class="admin-header">
            <h1>لوحة التحكم - صالون كالابش</h1>
            <p>تعديل محتوى الصفحات ورفع الصور</p>
        </div>

        <!-- مصادقة الإدارة: إدخال رمز الإدارة -->
        <div class="content-editor" id="authPanel">
            <div class="editor-section">
                <h3>رمز الإدارة</h3>
                <label for="tokenInput" class="visually-hidden">رمز الإدارة</label>
                <input type="text" id="tokenInput" placeholder="أدخل رمز الإدارة هنا" title="رمز الإدارة">
            </div>
            <button class="save-btn" id="tokenSave" title="حفظ رمز الإدارة">حفظ الرمز</button>
        </div>

        <div class="status-message" id="statusMessage"></div>

        <div class="page-selector">
            <label for="pageSelect">اختر الصفحة:</label>
            <select id="pageSelect"></select>
        </div>
        <div class="content-editor" id="editor"></div>

        <div class="image-upload-section">
            <h3>رفع الصور</h3>
            <div class="upload-controls" id="uploadControls">
                <label for="insertPosition">موضع الإدراج:</label>
                <select id="insertPosition" title="اختر موضع إدراج الصور في قائمة المعرض">
                    <option value="end" selected>نهاية القائمة</option>
                    <option value="start">بداية القائمة</option>
                </select>
                <label for="autoSortNew" style="margin-inline-start:10px;">
                    <input type="checkbox" id="autoSortNew" /> ترتيب أحدث صور بالأعلى
                </label>
            </div>
            <div class="upload-area" id="uploadArea">
                <div class="upload-text">انقر لاختيار الصور أو اسحبها هنا</div>
                <div class="upload-hint">يمكنك رفع صور JPG، PNG، GIF</div>
                <label for="imageInput" class="visually-hidden">اختيار الصور للرفع</label>
                <input type="file" id="imageInput" name="images[]" multiple accept=".jpg,.jpeg,.png,.gif" title="اختيار الصور">
            </div>
            <div class="uploaded-images" id="uploadedImages"></div>
        </div>

        <button class="save-btn" id="saveBtn">حفظ التغييرات</button>
    </div>
    
    <script src="assets/js/admin.js"></script>
    
    <div class="toast-container"><div id="toast" class="toast hidden" role="status" aria-live="polite"></div></div>
    <script src="assets/js/error-filter.js"></script>
</body>
</html>