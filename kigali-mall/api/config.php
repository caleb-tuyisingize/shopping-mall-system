<?php
// // config.php
// // Clean version - No extra headers, just connection

$host = 'localhost';
$db   = 'kigali_inventory';
$user = 'root';
$pass = ''; // Keep empty if using default XAMPP

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
} catch (PDOException $e) {
    // TRICK: We send 200 OK even on error, so the browser lets us see the message!
    http_response_code(200); 
    echo json_encode([
        "status" => "error",
        "message" => "DATABASE CONNECTION FAILED: " . $e->getMessage()
    ]);
    exit;
}
?>