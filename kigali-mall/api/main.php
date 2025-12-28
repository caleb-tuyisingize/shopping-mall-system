<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// REQUIRED: Import PHPMailer classes manually
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

// Load PHPMailer files (Ensure the 'PHPMailer' folder exists in the same directory)
require 'PHPMailer/Exception.php';
require 'PHPMailer/PHPMailer.php';
require 'PHPMailer/SMTP.php';

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents("php://input"), true) ?? [];

// ============================================
// AUTHENTICATION (EMAIL OTP & PASSWORD)
// ============================================

if ($action === 'login') {
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    
    // Fetch user details including EMAIL
    $stmt = $pdo->prepare("SELECT user_id, password, role, full_name, email FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        // Generate OTP
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiry = date("Y-m-d H:i:s", strtotime("+5 minutes"));
        
        // Save OTP
        $update = $pdo->prepare("UPDATE users SET otp_code = ?, otp_expiry = ? WHERE user_id = ?");
        $update->execute([$otp, $expiry, $user['user_id']]);
        
        // Send Email if address exists
        if (!empty($user['email'])) {
            $subject = "Kigali Mall Login Code";
            $body = "<h3>Login Verification</h3><p>Your OTP code is: <b style='font-size: 24px; color: blue;'>$otp</b></p><p>Valid for 5 minutes.</p>";
            
            $emailResult = sendEmail($user['email'], $subject, $body);
            
            if ($emailResult === true) {
                echo json_encode([
                    "status" => "otp_sent",
                    "message" => "OTP sent to your email: " . $user['email']
                ]);
            } else {
                // Email failed fallback
                echo json_encode([
                    "status" => "otp_sent",
                    "debug_otp" => $otp,
                    "message" => "Email failed (" . $emailResult . "). Using Debug Mode."
                ]);
            }
        } else {
            // No email fallback
            echo json_encode([
                "status" => "otp_sent",
                "debug_otp" => $otp, 
                "message" => "No email linked to account. Using Debug Mode."
            ]);
        }
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Invalid username or password"]);
    }
    exit;
}

if ($action === 'verify_otp') {
    $username = $data['username'] ?? '';
    $otp = $data['otp'] ?? '';
    
    $stmt = $pdo->prepare("SELECT user_id, role, full_name, otp_expiry FROM users WHERE username = ? AND otp_code = ?");
    $stmt->execute([$username, $otp]);
    $user = $stmt->fetch();

    if ($user && strtotime($user['otp_expiry']) > time()) {
        $token = bin2hex(random_bytes(32));
        
        // Clear OTP
        $pdo->prepare("UPDATE users SET otp_code = NULL, otp_expiry = NULL, last_activity = NOW() WHERE user_id = ?")
            ->execute([$user['user_id']]);
        
        echo json_encode([
            "status" => "success",
            "token" => $token,
            "user" => [
                "id" => $user['user_id'],
                "username" => $username,
                "role" => $user['role'],
                "full_name" => $user['full_name']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Invalid or expired OTP"]);
    }
    exit;
}

// --- NEW: CHANGE PASSWORD ACTION ---
if ($action === 'change_password') {
    $user_id = $data['user_id'] ?? '';
    $current_password = $data['current_password'] ?? '';
    $new_password = $data['new_password'] ?? '';

    if (empty($user_id) || empty($current_password) || empty($new_password)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "error" => "All fields are required"]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT password FROM users WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();

    if ($user && password_verify($current_password, $user['password'])) {
        $new_hash = password_hash($new_password, PASSWORD_DEFAULT);
        $update = $pdo->prepare("UPDATE users SET password = ? WHERE user_id = ?");
        $update->execute([$new_hash, $user_id]);
        
        echo json_encode(["status" => "success", "message" => "Password changed successfully"]);
    } else {
        http_response_code(401);
        echo json_encode(["status" => "error", "error" => "Current password is incorrect"]);
    }
    exit;
}

// ============================================
// INVENTORY & ITEMS
// ============================================

if ($action === 'get_items') {
    $stmt = $pdo->query("
        SELECT i.item_id, i.item_name, i.unit, i.selling_price, i.buying_price, i.reorder_level,
               COALESCE(inv.current_quantity, 0) as current_quantity, 
               c.category_name, c.category_id
        FROM items i
        LEFT JOIN inventory inv ON i.item_id = inv.item_id
        LEFT JOIN categories c ON i.category_id = c.category_id
        ORDER BY i.item_name
    ");
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($action === 'add_item') {
    $stmt = $pdo->prepare("INSERT INTO items (item_name, category_id, unit, selling_price, buying_price, reorder_level) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$data['item_name'], $data['category_id'] ?? null, $data['unit'] ?? 'pcs', $data['selling_price'] ?? 0, $data['buying_price'] ?? 0, $data['reorder_level'] ?? 10]);
    
    $item_id = $pdo->lastInsertId();
    $pdo->prepare("INSERT INTO inventory (item_id, current_quantity) VALUES (?, 0)")->execute([$item_id]);
    
    echo json_encode(["status" => "success", "item_id" => $item_id]);
    exit;
}

// ============================================
// STOCK OPERATIONS
// ============================================

if ($action === 'stock_in') {
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO stock_in (item_id, supplier_id, quantity, received_by, reference_no) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$data['item_id'], $data['supplier_id'] ?? null, $data['quantity'], $data['user_id'] ?? 1, $data['reference_no'] ?? null]);
        
        $update = $pdo->prepare("UPDATE inventory SET current_quantity = current_quantity + ? WHERE item_id = ?");
        $update->execute([$data['quantity'], $data['item_id']]);
        
        if ($update->rowCount() === 0) {
            $pdo->prepare("INSERT INTO inventory (item_id, current_quantity) VALUES (?, ?)")->execute([$data['item_id'], $data['quantity']]);
        }
        
        $pdo->commit();
        echo json_encode(["status" => "success", "message" => "Stock received successfully"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit;
}

if ($action === 'stock_out') {
    $pdo->beginTransaction();
    try {
        $ebm_sig = "EBM-RRA-" . strtoupper(bin2hex(random_bytes(4))) . "-" . date('Ymd');
        
        // Includes PAYMENT_METHOD_ID
        $stmt = $pdo->prepare("INSERT INTO stock_out (item_id, quantity, ebm_signature, reason, issued_by, reference_no, payment_method_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['item_id'], 
            $data['quantity'], 
            $ebm_sig, 
            $data['reason'] ?? 'sale', 
            $data['user_id'] ?? 1, 
            $data['reference_no'] ?? null,
            $data['payment_method_id'] ?? null
        ]);
        
        $update = $pdo->prepare("UPDATE inventory SET current_quantity = current_quantity - ? WHERE item_id = ? AND current_quantity >= ?");
        $update->execute([$data['quantity'], $data['item_id'], $data['quantity']]);
        
        if ($update->rowCount() === 0) {
            throw new Exception("Insufficient stock or Item not found");
        }
        
        $pdo->commit();
        echo json_encode(["status" => "success", "ebm_signature" => $ebm_sig, "message" => "Sale recorded with EBM signature"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit;
}

if ($action === 'stock_adjust') {
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO stock_adjustments (item_id, quantity_change, reason, adjusted_by) VALUES (?, ?, ?, ?)");
        $stmt->execute([$data['item_id'], $data['quantity_change'], $data['reason'] ?? 'Adjustment', $data['user_id'] ?? 1]);
        
        $update = $pdo->prepare("UPDATE inventory SET current_quantity = current_quantity + ? WHERE item_id = ?");
        $update->execute([$data['quantity_change'], $data['item_id']]);
        
        $pdo->commit();
        echo json_encode(["status" => "success", "message" => "Stock adjusted successfully"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit;
}

// ============================================
// ANALYTICS & STATS
// ============================================

if ($action === 'analytics') {
    $stmt = $pdo->query("SELECT i.item_id, i.item_name, i.reorder_level, inv.current_quantity, c.category_name, 
        COALESCE((SELECT SUM(quantity)/30 FROM stock_out WHERE item_id = i.item_id AND stock_out_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND reason = 'sale'), 0) as daily_burn_rate 
        FROM items i LEFT JOIN inventory inv ON i.item_id = inv.item_id LEFT JOIN categories c ON i.category_id = c.category_id ORDER BY inv.current_quantity ASC");
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($action === 'dashboard_stats') {
    $stats = [];
    $stats['total_items'] = $pdo->query("SELECT COUNT(*) FROM items")->fetchColumn();
    $stats['low_stock'] = $pdo->query("SELECT COUNT(*) FROM items i JOIN inventory inv ON i.item_id = inv.item_id WHERE inv.current_quantity <= i.reorder_level")->fetchColumn();
    $stats['total_value'] = $pdo->query("SELECT SUM(inv.current_quantity * i.selling_price) FROM inventory inv JOIN items i ON inv.item_id = i.item_id")->fetchColumn() ?? 0;
    $stats['today_sales_qty'] = $pdo->query("SELECT SUM(quantity) FROM stock_out WHERE DATE(stock_out_date) = CURDATE() AND reason = 'sale'")->fetchColumn() ?? 0;
    $stats['today_stock_in'] = $pdo->query("SELECT SUM(quantity) FROM stock_in WHERE DATE(stock_in_date) = CURDATE()")->fetchColumn() ?? 0;
    echo json_encode($stats);
    exit;
}

// ============================================
// CATEGORIES, SUPPLIERS & PAYMENTS
// ============================================

if ($action === 'get_categories') {
    echo json_encode($pdo->query("SELECT * FROM categories ORDER BY category_name")->fetchAll());
    exit;
}

if ($action === 'add_category') {
    try {
        if (empty($data['category_name'])) throw new Exception("Category name required");
        $pdo->prepare("INSERT INTO categories (category_name, description) VALUES (?, ?)")->execute([$data['category_name'], $data['description'] ?? '']);
        echo json_encode(["status" => "success", "message" => "Category added", "category_id" => $pdo->lastInsertId()]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "error" => $e->getMessage()]);
    }
    exit;
}

if ($action === 'get_suppliers') {
    echo json_encode($pdo->query("SELECT * FROM suppliers ORDER BY supplier_name")->fetchAll());
    exit;
}

// --- NEW: GET PAYMENT METHODS ---
if ($action === 'get_payment_methods') {
    echo json_encode($pdo->query("SELECT * FROM payment_methods")->fetchAll());
    exit;
}

// ============================================
// HISTORY
// ============================================

if ($action === 'stock_in_history') {
    echo json_encode($pdo->query("SELECT si.*, i.item_name, s.supplier_name, u.username as received_by_name FROM stock_in si JOIN items i ON si.item_id = i.item_id LEFT JOIN suppliers s ON si.supplier_id = s.supplier_id LEFT JOIN users u ON si.received_by = u.user_id ORDER BY si.stock_in_date DESC LIMIT 100")->fetchAll());
    exit;
}

if ($action === 'stock_out_history') {
    // UPDATED: Joins payment_methods
    echo json_encode($pdo->query("
        SELECT so.*, i.item_name, u.username as issued_by_name, pm.method_name
        FROM stock_out so 
        JOIN items i ON so.item_id = i.item_id 
        LEFT JOIN users u ON so.issued_by = u.user_id 
        LEFT JOIN payment_methods pm ON so.payment_method_id = pm.payment_method_id
        ORDER BY so.stock_out_date DESC LIMIT 100
    ")->fetchAll());
    exit;
}

// ============================================
// EMAIL FUNCTION
// ============================================

function sendEmail($to, $subject, $body) {
    $mail = new PHPMailer(true);
    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'aimetiti8@gmail.com'; 
        $mail->Password   = 'azvs zzyb qybw ajhc';  
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // Recipients
        $mail->setFrom('aimetiti8@gmail.com', 'Kigali Mall System');
        $mail->addAddress($to);

        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $body;

        $mail->send();
        return true;
    } catch (Exception $e) {
        return $mail->ErrorInfo;
    }
}
?>