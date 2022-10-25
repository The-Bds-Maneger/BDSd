import Navbar from "../components/oldNavbar";
import Log from "../components/logConsole";

export default function Home() {
  return <Navbar items={[{name: "test"}, {name: "test2", onClick: () => alert("Test 2")},]}>
    <Log dataInputFn={console.log} />
  </Navbar>;
}