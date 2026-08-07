# cloudformation/ - AWS へ移行するときの最小雛形

このテンプレートは**ローカル Docker 完結**が主目的だが、将来 AWS で公開したくなったときの
足がかりとして最小の CloudFormation テンプレートを同梱している。

`template.yaml` が作るもの:

```
              ┌────────────── CloudFront ──────────────┐
 ブラウザ ──▶ │  / , /assets/*  → S3 (フロント静的配信)  │
              │  /api/*         → API Gateway → Lambda   │
              └──────────────────────────────────────────┘
```

- 認証・WAF（IP 制限）・データストアは**含まない**（インターネットに全公開になる）。
  それらが必要な場合は `aws-startup-template` スキルの利用を検討する。
- インメモリのデータは Lambda ではリクエスト間で保持されない。実運用には
  DynamoDB 等の永続化が必要。

## デプロイ手順（AWS CLI）

```powershell
# 1. スタック作成（S3 / CloudFront / Lambda / API Gateway）
aws cloudformation deploy `
  --template-file cloudformation/template.yaml `
  --stack-name cameraman-facility-app `
  --capabilities CAPABILITY_NAMED_IAM `
  --region ap-northeast-1

# 2. バックエンドをビルドして Lambda に反映
cd backend
npm install
npm run build:zip    # function.zip を生成（ハンドラ lambda.handler）
aws lambda update-function-code `
  --function-name cameraman-facility-app-api `
  --zip-file fileb://function.zip `
  --region ap-northeast-1
cd ..

# 3. フロントエンドをビルドして S3 に配信
cd frontend
npm install
npm run build
$bucket = aws cloudformation describe-stacks --stack-name cameraman-facility-app --region ap-northeast-1 `
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text
aws s3 sync dist "s3://$bucket" --delete
cd ..

# 4. CloudFront キャッシュを無効化して URL を確認
$distId = aws cloudformation describe-stacks --stack-name cameraman-facility-app --region ap-northeast-1 `
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text
aws cloudfront create-invalidation --distribution-id $distId --paths "/*"

aws cloudformation describe-stacks --stack-name cameraman-facility-app --region ap-northeast-1 `
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomainName'].OutputValue" --output text
```

## 片付け

```powershell
# S3 バケットを空にしてからスタックを削除する
aws s3 rm "s3://$bucket" --recursive
aws cloudformation delete-stack --stack-name cameraman-facility-app --region ap-northeast-1
```
