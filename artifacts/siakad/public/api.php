<?php
/**
 * Si@Kad Madrasah — MySQL API Backend
 * Compatible dengan hosting cPanel, Plesk, DirectAdmin, Niagahoster, IDCloudHost, dll.
 *
 * Cara pakai:
 * 1. Edit bagian KONFIGURASI DATABASE di bawah
 * 2. Upload seluruh folder ke public_html atau subdomain
 * 3. Pastikan config.js menggunakan: window.__ENV_USE_MYSQL__ = true;
 */

// ============================================================
// KONFIGURASI DATABASE — Sesuaikan dengan hosting Anda
// ============================================================
define('DB_HOST',     getenv('SIAKAD_DB_HOST')     ?: 'localhost');
define('DB_NAME',     getenv('SIAKAD_DB_NAME')     ?: 'siakad_db');
define('DB_USER',     getenv('SIAKAD_DB_USER')     ?: 'root');
define('DB_PASS',     getenv('SIAKAD_DB_PASS')     ?: '');
define('DB_CHARSET',  'utf8mb4');
define('UPLOAD_DIR',  __DIR__ . '/uploads/');
define('UPLOAD_URL',  '/uploads/');
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Pastikan folder uploads ada
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

$action = $_GET['action'] ?? '';
$table  = preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['table'] ?? '');
$id     = $_GET['id'] ?? null;

// Koneksi PDO
function getDb(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci',
        ]);
    }
    return $pdo;
}

function jsonOk($data): void {
    echo json_encode(['data' => $data, 'error' => null], JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonErr(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['data' => null, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

// Pastikan tabel ada (auto-create jika belum ada)
function ensureTable(PDO $db, string $table): void {
    try {
        $db->query("SELECT 1 FROM `$table` LIMIT 1");
    } catch (PDOException $e) {
        // Tabel belum ada, buat otomatis dengan kolom minimal
        $db->exec("CREATE TABLE IF NOT EXISTS `$table` (
            `id` VARCHAR(191) NOT NULL PRIMARY KEY,
            `data` LONGTEXT,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }
}

// Auto-create kolom yang belum ada
function ensureColumns(PDO $db, string $table, array $keys): void {
    $stmt = $db->query("DESCRIBE `$table`");
    $existingCols = array_column($stmt->fetchAll(), 'Field');
    foreach ($keys as $key) {
        $col = preg_replace('/[^a-zA-Z0-9_]/', '', $key);
        if ($col && !in_array($col, $existingCols, true) && $col !== 'id') {
            try {
                $db->exec("ALTER TABLE `$table` ADD COLUMN `$col` LONGTEXT");
            } catch (PDOException $e) {
                // Ignore jika kolom sudah ada (race condition)
            }
        }
    }
}

try {
    $db = getDb();

    switch ($action) {

        // ─── SELECT ─────────────────────────────────────────────────────────
        case 'select':
            if (!$table) jsonErr('table required');
            ensureTable($db, $table);

            if ($id !== null) {
                $stmt = $db->prepare("SELECT * FROM `$table` WHERE `id` = ? LIMIT 1");
                $stmt->execute([$id]);
                $row = $stmt->fetch();

                if ($row && isset($row['data']) && is_string($row['data'])) {
                    $decoded = json_decode($row['data'], true);
                    if (is_array($decoded)) {
                        $row = array_merge($row, $decoded);
                        unset($row['data']);
                    }
                }
                jsonOk($row ?: null);
            } else {
                $stmt = $db->query("SELECT * FROM `$table` ORDER BY `updated_at` DESC");
                $rows = $stmt->fetchAll();
                $result = [];
                foreach ($rows as $row) {
                    if (isset($row['data']) && is_string($row['data'])) {
                        $decoded = json_decode($row['data'], true);
                        if (is_array($decoded)) {
                            $row = array_merge($row, $decoded);
                            unset($row['data']);
                        }
                    }
                    $result[] = $row;
                }
                jsonOk($result);
            }

        // ─── UPSERT (INSERT + UPDATE) ────────────────────────────────────────
        case 'upsert':
            if (!$table) jsonErr('table required');
            $payload = json_decode(file_get_contents('php://input'), true);
            if (!is_array($payload)) jsonErr('invalid JSON payload');

            ensureTable($db, $table);

            // Jika payload adalah array of rows
            if (isset($payload[0]) && is_array($payload[0])) {
                $rows = $payload;
            } else {
                $rows = [$payload];
            }

            $inserted = [];
            foreach ($rows as $row) {
                if (empty($row['id'])) {
                    $row['id'] = bin2hex(random_bytes(16));
                }
                $id_val = $row['id'];

                // Auto-ensure kolom
                ensureColumns($db, $table, array_keys($row));

                // Build INSERT ... ON DUPLICATE KEY UPDATE
                $cols   = array_keys($row);
                $colStr = implode('`, `', array_map(fn($c) => preg_replace('/[^a-zA-Z0-9_]/', '', $c), $cols));
                $placeholders = implode(', ', array_fill(0, count($cols), '?'));
                $updates = implode(', ', array_map(fn($c) => '`' . preg_replace('/[^a-zA-Z0-9_]/', '', $c) . '` = VALUES(`' . preg_replace('/[^a-zA-Z0-9_]/', '', $c) . '`)', $cols));

                $sql  = "INSERT INTO `$table` (`$colStr`) VALUES ($placeholders) ON DUPLICATE KEY UPDATE $updates";
                $stmt = $db->prepare($sql);
                $stmt->execute(array_values($row));

                $inserted[] = $row;
            }

            jsonOk(count($inserted) === 1 ? $inserted[0] : $inserted);

        // ─── DELETE ──────────────────────────────────────────────────────────
        case 'delete':
            if (!$table) jsonErr('table required');
            if ($id === null) jsonErr('id required');
            ensureTable($db, $table);
            $stmt = $db->prepare("DELETE FROM `$table` WHERE `id` = ?");
            $stmt->execute([$id]);
            jsonOk(true);

        // ─── UPLOAD FILE ─────────────────────────────────────────────────────
        case 'upload':
            if (empty($_FILES['file'])) jsonErr('no file uploaded');
            $file     = $_FILES['file'];
            $filePath = $_POST['filePath'] ?? ('uploads/' . time() . '_' . basename($file['name']));

            // Sanitasi path
            $safePath = preg_replace('/[^a-zA-Z0-9_\-\/\.]/', '_', $filePath);
            $fullPath = UPLOAD_DIR . ltrim(str_replace('uploads/', '', $safePath), '/');
            $dir      = dirname($fullPath);

            if (!is_dir($dir)) mkdir($dir, 0755, true);

            if (!move_uploaded_file($file['tmp_name'], $fullPath)) {
                jsonErr('upload failed', 500);
            }

            $publicUrl = UPLOAD_URL . ltrim(str_replace('uploads/', '', $safePath), '/');
            echo json_encode([
                'data'      => ['path' => $safePath],
                'publicUrl' => (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . $publicUrl,
                'error'     => null,
            ], JSON_UNESCAPED_UNICODE);
            exit;

        // ─── HEALTH CHECK ────────────────────────────────────────────────────
        case 'health':
            $db->query('SELECT 1');
            jsonOk(['status' => 'ok', 'db' => DB_NAME]);

        default:
            jsonErr('unknown action: ' . htmlspecialchars($action));
    }

} catch (PDOException $e) {
    jsonErr('Database error: ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    jsonErr('Server error: ' . $e->getMessage(), 500);
}
