<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once 'config.php';
$action = $_GET['action'] ?? '';

// LIST ITEMS (Joins items with categories)
if ($action === 'list') {
    $query = "SELECT i.id, i.item_name, i.stock_qty, i.selling_price, c.name as category 
              FROM items i 
              LEFT JOIN categories c ON i.category_id = c.id";
    $stmt = $pdo->query($query);
    echo json_encode($stmt->fetchAll());
}

// SELL / STOCK OUT (Uses stock_log columns)
if ($action === 'sell') {
    $req = json_decode(file_get_contents("php://input"), true);
    $ebm_sig = "EBM-" . strtoupper(bin2hex(random_bytes(4)));

    // 1. Insert into stock_log (item_id, type, quantity, ebm_signature)
    $log = $pdo->prepare("INSERT INTO stock_log (item_id, type, quantity, ebm_signature) VALUES (?, 'OUT', ?, ?)");
    $log->execute([$req['item_id'], $req['qty'], $ebm_sig]);

    // 2. Update items (stock_qty)
    $upd = $pdo->prepare("UPDATE items SET stock_qty = stock_qty - ? WHERE id = ?");
    $upd->execute([$req['qty'], $req['item_id']]);

    echo json_encode(["status" => "success", "signature" => $ebm_sig]);
}

// AI PREDICTION
if ($action === 'predict') {
    $id = $_GET['item_id'];
    $stmt = $pdo->prepare("SELECT SUM(quantity) as sold FROM stock_log WHERE item_id = ? AND type = 'OUT' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
    $stmt->execute([$id]);
    $res = $stmt->fetch();
    
    $avg = ($res['sold'] ?? 0) / 30;
    echo json_encode(["suggested" => ceil($avg * 7), "daily_avg" => round($avg, 2)]);
}
?>