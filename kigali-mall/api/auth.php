<?php
// 1. HEADERS MUST BE FIRST
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// 2. THE FIX: Handle the "Pre-flight" OPTIONS request
// The browser sends this to check if it's safe to send the POST request.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(); // Stop here! Don't let the script continue.
}

// 3. LOAD DATABASE
require_once 'config.php';

$data = json_decode(file_get_contents("php://input"), true);
$action = $_GET['action'] ?? '';

// --- PHASE 1: INITIAL LOGIN ---
if ($action === 'login') {
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    $stmt = $pdo->prepare("SELECT id, password, role FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    // DEBUG: Check if user exists and if password matches
    if (!$user) {
        echo json_encode(["error" => "User $username not found in database"]);
        exit;
    }

    if (password_verify($password, $user['password'])) {
        // ... rest of your OTP generation code ...
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Password mismatch for $username"]);
    }
}
// ... rest of your code ...

// VERIFY PHASE
if ($action === 'verify_otp') {
    $user_input = $data['username'] ?? '';
    $otp_input = $data['otp'] ?? '';

    $stmt = $pdo->prepare("SELECT id, role FROM users WHERE username = ? AND otp_code = ? AND otp_expiry > NOW()");
    $stmt->execute([$user_input, $otp_input]);
    $user = $stmt->fetch();

    if ($user) {
        echo json_encode([
            "status" => "success",
            "token" => bin2hex(random_bytes(32)),
            "user" => ["role" => $user['role'], "username" => $user_input]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Invalid/Expired OTP"]);
    }
}
?>