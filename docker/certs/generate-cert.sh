#!/usr/bin/env bash
set -euo pipefail

# オンプレ公開用の自己署名証明書を生成する。
#
# 公開CA（Let's Encrypt等）はドメイン名の所有確認が前提のため、
# IPアドレス直アクセスの環境では使えない。社内限定公開であれば
# 自己署名証明書で暗号化のみ行い、ブラウザの信頼は
# 利用者PCへのルート証明書配布（または警告の許容）で運用する。
#
# 使い方: ./generate-cert.sh <公開先IPアドレスまたはホスト名>
# 例:    ./generate-cert.sh 10.1.2.3

if [ $# -ne 1 ]; then
  echo "使い方: $0 <公開先IPアドレスまたはホスト名>" >&2
  exit 1
fi

TARGET="$1"
DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ "$TARGET" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then
  SAN="IP:$TARGET"
else
  SAN="DNS:$TARGET"
fi

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$DIR/server.key" \
  -out "$DIR/server.crt" \
  -days 3650 \
  -subj "/CN=$TARGET" \
  -addext "subjectAltName=$SAN"

echo "生成しました: $DIR/server.crt / $DIR/server.key"
echo "有効期限: 3650日（自己署名のため長め）"
echo "利用者PCで警告を出したくない場合は server.crt をルート証明書として配布してください。"
