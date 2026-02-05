import { ParentProps } from "solid-js";
import { useNavigate } from "@solidjs/router";
import Navbar from "./components/Navbar";
import Background from "./components/Background";
import NotificationContainer from "./components/NotificationContainer";
import Footer from "./components/Footer";

export default function App(props: ParentProps) {
  const navigate = useNavigate();
  window.solidNavigate = navigate;

  return (
    <>
      <Background />
      <Navbar />
      <main class="container">
        <div id="solid-root">
          {props.children}
        </div>
      </main>
      <NotificationContainer />
      <Footer />
    </>
  );
}