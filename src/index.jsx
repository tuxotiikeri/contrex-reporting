/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import App from "./App.jsx";
import {language} from "./i18n/index.js";

document.documentElement.lang = language();

const root = document.getElementById("root");

render(() => <App />, root);
