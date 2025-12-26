<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// KIGALI MALL - Complete Backend API
// Handles: Authentication, Stock Management, Analytics, EBM


header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents("php://input"), true) ?? [];

// ============================================
// AUTHENTICATION
// ============================================

if ($action === 'login') {
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    
    $stmt = $pdo->prepare("SELECT user_id, password, role, full_name FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
            $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiry = date("Y-m-d H:i:s", strtotime("+5 minutes"));
        
        $update = $pdo->prepare("UPDATE users SET otp_code = ?, otp_expiry = ? WHERE user_id = ?");
        $update->execute([$otp, $expiry, $user['user_id']]);
        
        echo json_encode([
            "status" => "otp_sent",
            "debug_otp" => $otp, // Remove in production
            "message" => "OTP sent to your device"
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Invalid username or password"]);
    }
    exit;
}

if ($action === 'verify_otp') {
    $username = $data['username'] ?? '';
    $otp = $data['otp'] ?? '';
   $stmt = $pdo->prepare("
    SELECT user_id, role, full_name, otp_expiry
    FROM users
    WHERE username = ? AND otp_code = ?
");
$stmt->execute([$username, $otp]);
$user = $stmt->fetch();

if ($user && strtotime($user['otp_expiry']) > time()) {
    // success
} else {
    http_response_code(401);
    echo json_encode(["error" => "OTP expired or invalid"]);
}

$stmt->execute([$username, $otp]);
    $user = $stmt->fetch();
    
    if ($user) {
        $token = bin2hex(random_bytes(32));
        
        // Clear OTP after use
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

// ============================================
// INVENTORY & ITEMS
// ============================================

if ($action === 'get_items') {
    $stmt = $pdo->query("
        SELECT i.item_id, i.item_name, i.unit, i.selling_price, i.buying_price, i.reorder_level,
               inv.current_quantity, c.category_name, c.category_id
        FROM items i
        LEFT JOIN inventory inv ON i.item_id = inv.item_id
        LEFT JOIN categories c ON i.category_id = c.category_id
        ORDER BY i.item_name
    ");
        echo json_encode($stmt->fetchAll());
    exit;
}

if ($action === 'add_item') {
    $stmt = $pdo->prepare("
        INSERT INTO items (item_name, category_id, unit, selling_price, buying_price, reorder_level)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $data['item_name'],
        $data['category_id'] ?? null,
        $data['unit'] ?? 'pcs',
        $data['selling_price'] ?? 0,
        $data['buying_price'] ?? 0,
        $data['reorder_level'] ?? 10
    ]);
    
    $item_id = $pdo->lastInsertId();
    
    // Initialize inventory
    $pdo->prepare("INSERT INTO inventory (item_id, current_quantity) VALUES (?, 0)")
        ->execute([$item_id]);
    
    echo json_encode(["status" => "success", "item_id" => $item_id]);
    exit;
}

// ============================================
// STOCK OPERATIONS
// ============================================

if ($action === 'stock_in') {
    $pdo->beginTransaction();
    try {
        // Record stock in transaction
        $stmt = $pdo->prepare("
            INSERT INTO stock_in (item_id, supplier_id, quantity, received_by, reference_no)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['item_id'],
            $data['supplier_id'] ?? null,
            $data['quantity'],
            $data['user_id'] ?? 1,
            $data['reference_no'] ?? null
        ]);
        
        // Update inventory
        $update = $pdo->prepare("
            UPDATE inventory SET current_quantity = current_quantity + ? 
            WHERE item_id = ?
        ");
        $update->execute([$data['quantity'], $data['item_id']]);
        
        // If inventory doesn't exist, create it
        if ($update->rowCount() === 0) {
            $pdo->prepare("INSERT INTO inventory (item_id, current_quantity) VALUES (?, ?)")
                ->execute([$data['item_id'], $data['quantity']]);
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
        // Generate EBM signature (dummy placeholder)
        $ebm_sig = "EBM-RRA-" . strtoupper(bin2hex(random_bytes(4))) . "-" . date('Ymd');
        
        // Record stock out
        $stmt = $pdo->prepare("
            INSERT INTO stock_out (item_id, quantity, ebm_signature, reason, issued_by, reference_no)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['item_id'],
            $data['quantity'],
            $ebm_sig,
            $data['reason'] ?? 'sale',
            $data['user_id'] ?? 1,
            $data['reference_no'] ?? null
        ]);
        
        // Update inventory
        $update = $pdo->prepare("
            UPDATE inventory SET current_quantity = current_quantity - ? 
            WHERE item_id = ? AND current_quantity >= ?
        ");
        $update->execute([$data['quantity'], $data['item_id'], $data['quantity']]);
        
        if ($update->rowCount() === 0) {
            throw new Exception("Insufficient stock");
        }
        
        $pdo->commit();
        echo json_encode([
            "status" => "success",
            "ebm_signature" => $ebm_sig,
            "message" => "Sale recorded with EBM signature"
        ]);
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
        // Record adjustment
        $stmt = $pdo->prepare("
            INSERT INTO stock_adjustments (item_id, quantity_change, reason, adjusted_by)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['item_id'],
            $data['quantity_change'], // Can be positive or negative
            $data['reason'] ?? 'Adjustment',
            $data['user_id'] ?? 1
        ]);
        
        // Update inventory
        $update = $pdo->prepare("
            UPDATE inventory SET current_quantity = current_quantity + ? 
            WHERE item_id = ?
        ");
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
// ANALYTICS & AI PREDICTIONS
// ============================================

if ($action === 'analytics') {
    // Get all items with current stock and AI predictions
    $stmt = $pdo->query("
        SELECT 
            i.item_id,
            i.item_name,
            i.reorder_level,
            inv.current_quantity,
            c.category_name,
            -- Calculate daily burn rate (average sales per day over last 30 days)
            COALESCE((
                SELECT SUM(quantity) / 30 
                FROM stock_out 
                WHERE item_id = i.item_id 
                AND stock_out_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND reason = 'sale'
            ), 0) as daily_burn_rate,
            -- Calculate days until stockout
            CASE 
                WHEN COALESCE((
                    SELECT SUM(quantity) / 30 
                    FROM stock_out 
                    WHERE item_id = i.item_id 
                    AND stock_out_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    AND reason = 'sale'
                ), 0) > 0 
                THEN FLOOR(inv.current_quantity / (
                    SELECT SUM(quantity) / 30 
                    FROM stock_out 
                    WHERE item_id = i.item_id 
                    AND stock_out_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    AND reason = 'sale'
                ))
                ELSE 999
            END as days_until_stockout,
            -- Suggested reorder quantity (30 days of stock based on burn rate)
            GREATEST(
                COALESCE((
                    SELECT SUM(quantity) 
                    FROM stock_out 
                    WHERE item_id = i.item_id 
                    AND stock_out_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    AND reason = 'sale'
                ), 0),
                i.reorder_level * 3
            ) as suggested_reorder_qty
        FROM items i
        LEFT JOIN inventory inv ON i.item_id = inv.item_id
        LEFT JOIN categories c ON i.category_id = c.category_id
        ORDER BY inv.current_quantity ASC, i.item_name
    ");
    
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($action === 'dashboard_stats') {
    $stats = [];
    
    // Total items
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM items");
    $stats['total_items'] = $stmt->fetch()['total'];
    
    // Low stock items (below reorder level)
    $stmt = $pdo->query("
        SELECT COUNT(*) as total 
        FROM items i
        JOIN inventory inv ON i.item_id = inv.item_id
        WHERE inv.current_quantity <= i.reorder_level
    ");
    $stats['low_stock'] = $stmt->fetch()['total'];
    
    // Total stock value
    $stmt = $pdo->query("
        SELECT SUM(inv.current_quantity * i.selling_price) as total_value
        FROM inventory inv
        JOIN items i ON inv.item_id = i.item_id
    ");
    $stats['total_value'] = $stmt->fetch()['total_value'] ?? 0;
    
    // Today's sales
    $stmt = $pdo->query("
        SELECT SUM(quantity) as total 
        FROM stock_out 
        WHERE DATE(stock_out_date) = CURDATE() 
        AND reason = 'sale'
    ");
    $stats['today_sales_qty'] = $stmt->fetch()['total'] ?? 0;
    
    // Today's stock in
    $stmt = $pdo->query("
        SELECT SUM(quantity) as total 
        FROM stock_in 
        WHERE DATE(stock_in_date) = CURDATE()
    ");
    $stats['today_stock_in'] = $stmt->fetch()['total'] ?? 0;
    
    echo json_encode($stats);
    exit;
}

// ============================================
// CATEGORIES & SUPPLIERS
// ============================================

if ($action === 'get_categories') {
    $stmt = $pdo->query("SELECT * FROM categories ORDER BY category_name");
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($action === 'get_suppliers') {
    $stmt = $pdo->query("SELECT * FROM suppliers ORDER BY supplier_name");
    echo json_encode($stmt->fetchAll());
    exit;
}

// ============================================
// TRANSACTION HISTORY
// ============================================

if ($action === 'stock_in_history') {
    $stmt = $pdo->query("
        SELECT si.*, i.item_name, s.supplier_name, u.username as received_by_name
        FROM stock_in si
        JOIN items i ON si.item_id = i.item_id
        LEFT JOIN suppliers s ON si.supplier_id = s.supplier_id
        LEFT JOIN users u ON si.received_by = u.user_id
        ORDER BY si.stock_in_date DESC
        LIMIT 100
    ");
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($action === 'stock_out_history') {
    $stmt = $pdo->query("
        SELECT so.*, i.item_name, u.username as issued_by_name
        FROM stock_out so
        JOIN items i ON so.item_id = i.item_id
        LEFT JOIN users u ON so.issued_by = u.user_id
        ORDER BY so.stock_out_date DESC
        LIMIT 100
    ");
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($action === 'ebm_report') {
    // Get EBM transactions for PDF export
    $stmt = $pdo->query("
        SELECT so.stock_out_date, i.item_name, so.quantity, so.ebm_signature, 
               i.selling_price, (so.quantity * i.selling_price) as total_amount
        FROM stock_out so
        JOIN items i ON so.item_id = i.item_id
        WHERE so.reason = 'sale' AND so.ebm_signature IS NOT NULL
        ORDER BY so.stock_out_date DESC
        LIMIT 100
    ");
    echo json_encode($stmt->fetchAll());
    exit;
}

// Default response
http_response_code(404);
echo json_encode(["error" => "Action not found"]);
?>
