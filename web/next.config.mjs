/** @type {import('next').NextConfig} */
const nextConfig = {
  // data/ 디렉터리를 repo 루트에서 읽으므로 외부 경로 접근 허용
  outputFileTracingRoot: process.cwd() + "/..",
};
export default nextConfig;
