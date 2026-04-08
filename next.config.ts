import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// cwd が親ディレクトリのままだと root がズレて Turbopack が巨大ツリーを監視し Compiling で固まることがあるため、
// 常にこの設定ファイルがあるディレクトリ（＝本プロジェクトのルート）を指す
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
