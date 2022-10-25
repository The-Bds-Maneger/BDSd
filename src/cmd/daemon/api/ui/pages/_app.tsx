import type { AppProps } from "next/app";
import Head from "next/head";

export default function MinecraftApkIndex({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <div>
        <Component {...pageProps} />
      </div>
    </>
  )
}

