<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw ?: '', true);
$email = strtolower(trim((string)($payload['email'] ?? '')));

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
    http_response_code(400);
    echo json_encode(['error' => 'Please enter a valid email address.']);
    exit;
}

$backendUrl = getenv('BETWEENUS_BACKEND_URL') ?: 'https://betweenus-production.up.railway.app';
$endpoint = rtrim($backendUrl, '/') . '/api/beta/applications';

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['email' => $email], JSON_UNESCAPED_SLASHES),
]);

$responseBody = curl_exec($ch);
$status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($responseBody === false || $curlError !== '') {
    error_log('[BetweenUs waitlist proxy] ' . $curlError);
    http_response_code(502);
    echo json_encode(['error' => 'The service is temporarily unavailable. Please try again.']);
    exit;
}

$decoded = json_decode($responseBody, true);
http_response_code($status >= 100 ? $status : 502);
echo json_encode(is_array($decoded) ? $decoded : [
    'error' => 'The service returned an invalid response. Please try again.'
]);
