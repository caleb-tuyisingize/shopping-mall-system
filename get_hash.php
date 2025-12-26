<?php
// get_hash.php - ***DELETE THIS FILE IMMEDIATELY AFTER USE***

$password_to_hash = 'admin123'; // Your raw password

// Generate the secure hash using PASSWORD_DEFAULT (which uses bcrypt)
$hashed_password = password_hash($password_to_hash, PASSWORD_DEFAULT);

echo "<h2>Password Hash Generator</h2>";
echo "<p><strong>Raw Password:</strong> " . htmlspecialchars($password_to_hash) . "</p>";
echo "<hr>";
echo "<p><strong>SECURE HASH TO PASTE INTO DATABASE:</strong></p>";
echo '<textarea rows="3" cols="60" style="width:100%; font-family:monospace; background-color:#f8f8f8; padding: 10px;">' . htmlspecialchars($hashed_password) . '</textarea>';
echo "<p style='color:red;'><strong>ACTION REQUIRED:</strong> Copy the entire string (it starts with $2y$) and paste it into the <code>password</code> field for user <code>calebmevis11</code> in your database.</p>";

exit();
?>