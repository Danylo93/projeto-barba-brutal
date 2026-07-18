/** @type {import('next').NextConfig} */
const nextConfig = {
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
