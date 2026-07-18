/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_URL_BASE: process.env.NEXT_PUBLIC_URL_BASE || 'https://barba-brutal-api.onrender.com',
    BACKEND_URL: process.env.BACKEND_URL || 'https://barba-brutal-api.onrender.com',
    NEXT_PUBLIC_TENANT_DEFAULT_ID: process.env.NEXT_PUBLIC_TENANT_DEFAULT_ID || '1',
  },
  images: {
    // Tenants podem fornecer URLs de imagem externas (logo, fotos de profissionais/serviços).
    // NOTA DE PRODUÇÃO: Permitir '**' em HTTPS é um risco de segurança (permite que qualquer URL seja processada pelo Image Optimization).
    // Quando você decidir onde as imagens serão hospedadas (ex: AWS S3, Cloudinary), substitua os wildcards abaixo pelo domínio correto.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;
