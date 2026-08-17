<?php
/* Italians.ch — raccolta email lista di lancio (teaser).
   Salva in signup-data/signups.tsv (cartella protetta da .htaccess deny).
   CORS ristretto a italians.ch. */
header('Access-Control-Allow-Origin: https://italians.ch');
header('Vary: Origin');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')   { http_response_code(405); echo json_encode(['ok'=>false]); exit; }

$raw   = file_get_contents('php://input');
$data  = json_decode($raw, true);
$email = is_array($data) ? trim((string)($data['email'] ?? '')) : '';

if ($email === '' || strlen($email) > 190 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400); echo json_encode(['ok'=>false, 'err'=>'email']); exit;
}
$email = strtolower($email);

$dir = __DIR__ . '/signup-data';
if (!is_dir($dir)) { @mkdir($dir, 0755); }
@file_put_contents($dir . '/.htaccess', "Require all denied\n");

$file     = $dir . '/signups.tsv';
$existing = is_file($file) ? file_get_contents($file) : '';
$dup      = (strpos($existing, "\t" . $email . "\t") !== false);

if (!$dup) {
  $lang = preg_replace('/[^a-z\-,;=. 0-9]/i', '', substr($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '', 0, 40));
  $line = date('c') . "\t" . $email . "\t" . ($_SERVER['REMOTE_ADDR'] ?? '') . "\t" . $lang . "\n";
  @file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
}

echo json_encode(['ok'=>true, 'dup'=>$dup]);
