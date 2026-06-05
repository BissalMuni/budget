/** @type {import('next').NextConfig} */
const nextConfig = {
  // 정적 사이트로 export (빌드타임에 repo 루트 data/를 읽어 HTML 생성)
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
