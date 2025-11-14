<?php
header('Content-Type: application/json');

$page = isset($_GET['page']) ? $_GET['page'] : '';
$file_path = __DIR__ . '/content/' . $page . '.json';

if (file_exists($file_path)) {
    $content = file_get_contents($file_path);
    echo $content;
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Page not found']);
}
?>