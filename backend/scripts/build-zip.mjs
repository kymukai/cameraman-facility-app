// Lambda デプロイ用 zip ビルドスクリプト（AWS デプロイ時のみ使用）。
// esbuild で src/lambda.ts を依存ごとバンドル（node_modules を含めない）し、
// backend 直下に function.zip を作成する。ハンドラは lambda.handler。

import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { platform } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const distDir = join(root, 'dist-lambda');
const outFile = join(distDir, 'lambda.js');
const zipPath = join(root, 'function.zip');

async function run() {
  // クリーン
  await rm(distDir, { recursive: true, force: true });
  await rm(zipPath, { force: true });
  await mkdir(distDir, { recursive: true });

  // バンドル（CommonJS, Node22 ターゲット）
  await build({
    entryPoints: [join(root, 'src', 'lambda.ts')],
    outfile: outFile,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    minify: true,
    sourcemap: false,
    // NestJS のオプショナル依存を無視（未使用のため）
    external: [
      '@nestjs/websockets',
      '@nestjs/microservices',
      'class-transformer/storage',
      'cache-manager',
    ],
    logLevel: 'info',
  });

  // zip 化
  await zipDir(distDir, zipPath);
  console.log(`created ${zipPath}`);
}

// dist-lambda 配下を zip にまとめる。
// Windows は PowerShell の Compress-Archive、それ以外は zip コマンドを使う。
async function zipDir(srcDir, dest) {
  if (platform() === 'win32') {
    const res = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Compress-Archive -Path '${join(srcDir, '*')}' -DestinationPath '${dest}' -Force`,
      ],
      { stdio: 'inherit' },
    );
    if (res.status !== 0) throw new Error('Compress-Archive に失敗しました');
    return;
  }

  const res = spawnSync('zip', ['-r', '-q', dest, '.'], {
    cwd: srcDir,
    stdio: 'inherit',
  });
  if (res.status !== 0) throw new Error('zip コマンドに失敗しました');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
