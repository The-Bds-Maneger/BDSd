// https://github.com/Sirherobrine23/Bds-Maneger/blob/d9f77f8aaffefec271669882602d025cbc85cf21/page/index.html#L20
import Link from "next/link";
import cssModule from "./oldNavbar.module.css";

export type itemsConfig = {
  name: string,
  url?: string,
  onClick?: () => void,
  svg?: JSX.Element,
  id?: string
};

export default function Navbar(props: {items: itemsConfig[], children?: JSX.Element}) {
  return (
    <div>
      <nav className={cssModule["navbar"]}>
        <ul className={cssModule["navbar-nav"]}>{
          props.items.map((config, key) => {
            return <li key={key} className={cssModule["nav-item"]}>
              <Link href={config.url||"#"}>
                <a className={cssModule["nav-link"]} id={config.id} onClick={() => {if (config.onClick) config.onClick();}}>
                  {config.svg}<span className={cssModule["link-text"]}>{config.name}</span>
                </a>
              </Link>
            </li>;
          })
        }</ul>
      </nav>
      <div className={cssModule["root"]}>{props.children}</div>
    </div>
  )
}