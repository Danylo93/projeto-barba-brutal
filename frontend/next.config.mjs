/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Tenants podem fornecer URLs de imagem externas (logo, fotos de profissionais/serviços).
    // Permitir hosts remotos evita que uma URL externa derrube a página via next/image.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;
