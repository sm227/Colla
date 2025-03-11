/** @type {import('next').NextConfig} */
const nextConfig = {
    images : {
        domains: ["img.clerk.com"],
    },
    webpack: (config) => {
        config.externals.push({
            'utf-8-validate': 'commonjs utf-8-validate',
            'bufferutil': 'commonjs bufferutil',
        })
        return config
    },
};

export default nextConfig;
