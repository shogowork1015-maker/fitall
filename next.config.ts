import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// cwd が親ディレクトリのままだと root がズレて Turbopack が巨大ツリーを監視し Compiling で固まることがあるため、
// 常にこの設定ファイルがあるディレクトリ（＝本プロジェクトのルート）を指す
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: projectRoot,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
