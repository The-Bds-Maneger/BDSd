import type { AppProps } from "next/app";
import Head from "next/head";

export default function MainAPP({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <title>BDSd Web UI</title>
      </Head>
      <div>
        <Component {...pageProps} />
      </div>
    </>
  )
}
