<?php
$url = "http://192.168.57.178/zabbix/api_jsonrpc.php";
$token = "dcb237a701e21445df8396813610eb1e6041b3f3dd6f0dbb0f74e3fde450e8ab";

$data = file_get_contents("php://input");
$data = str_replace("YOUR_TOKEN_HERE",$token,$data);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
$result = curl_exec($ch);
curl_close($ch);

echo $result;
?>
