import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(() => {
  return {
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    // A6 AI 维度推荐 — 浏览器请求 /api/llm/* 时由 dev server 转发到 DeepSeek
    // 用户的 key 放在 X-Api-Key 请求头里（不污染 body），proxy 拦截后改写成
    // Authorization 头再转发到 DeepSeek。真实 key 始终留在浏览器↔dev-server 之间。
    // DeepSeek 官方 endpoint: https://api.deepseek.com/chat/completions
    server: {
      proxy: {
        '/api/llm': {
          target: 'https://api.deepseek.com',
          changeOrigin: true,
          secure: true,
          // /api/llm/chat/completions → https://api.deepseek.com/chat/completions
          rewrite: (p) => p.replace(/^\/api\/llm/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // Node IncomingMessage 头是小写的；用户 key 在 X-Api-Key 里
              const userKey = (req.headers['x-api-key'] as string | undefined) ?? ''
              if (userKey) {
                proxyReq.setHeader('Authorization', `Bearer ${userKey}`)
                // 把 X-Api-Key 从出站头里删掉，避免 key 泄漏到 DeepSeek 访问日志
                proxyReq.removeHeader('X-Api-Key')
              }
            })
          },
        },
      },
    },
  }
})
