import type { AppProps } from "next/app";
import Head from "next/head";
import Link from "next/link";
import NavbarCSS from "../styles/Navbar.module.css";
import "../styles/globals.css";

export type itemsConfig = {
  name: string,
  url?: string,
  onClick?: () => void,
  svg?: JSX.Element,
  id?: string
};

export default function MainAPP({ Component, pageProps }: AppProps) {
  const navBarItens: itemsConfig[] = [];
  return <>
    <Head>
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      <title>Loading ...</title>
    </Head>
    <nav className={NavbarCSS["navigation"]}>
      <Link href="/" className={NavbarCSS["brand-name"]}>BDSd</Link>
      <button className={NavbarCSS["hamburger"]}>
        {/* icon from heroicons.com */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="white">
          <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM9 15a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1z" clipRule="evenodd"/>
        </svg>
      </button>
      <div
        className={NavbarCSS["navigation-menu"]}>
        <ul>{navBarItens.map((compo, index) => {
          return <li key={index}>
            <Link href={compo.url||"#"} target="_blank">{compo.svg} {compo.name}</Link>
          </li>;
        })}</ul>
      </div>
    </nav>
    <div style={{marginTop: "10px"}}><Component {...pageProps} /></div>
  </>;
}