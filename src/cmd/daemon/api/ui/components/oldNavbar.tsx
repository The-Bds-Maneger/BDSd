// https://github.com/Sirherobrine23/Bds-Maneger/blob/d9f77f8aaffefec271669882602d025cbc85cf21/page/index.html#L20
import Link from "next/link";
import NavbarCSS from "./oldNavbar.module.css";

export type itemsConfig = {
  name: string,
  url?: string,
  onClick?: () => void,
  svg?: JSX.Element,
  id?: string
};

// Navbar.js
export default function Navbar(props: {items: itemsConfig[], children?: JSX.Element}) {
  return (
    <nav className={NavbarCSS["navigation"]}>
      <Link href="/"><a className={NavbarCSS["brand-name"]}>BDSd Web UI</a></Link>
      <button className={NavbarCSS["hamburger"]}>
        {/* icon from heroicons.com */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="white">
          <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM9 15a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1z" clipRule="evenodd"/>
        </svg>
      </button>
      <div
        className={NavbarCSS["navigation-menu"]}>
        <ul>{props.items.map(compo => {
          return <li>
            <Link href={compo.url||"#"}><a>{compo.name}{compo.svg}</a></Link>
          </li>;
        })}</ul>
      </div>
    </nav>
  );
}