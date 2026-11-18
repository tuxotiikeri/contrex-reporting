import {render} from "solid-js/web";
import {FileBrowser} from "../../src/components/FileBrowser.jsx";
import {setFiles, setSessions} from "../../src/signals.js";
import * as qaSignals from "../../src/signals.js";
import "../../src/index.css";

// Isolated UI fixture: no filesystem permissions, real measurements or workers.
// Tests can deliver delayed replies, even after terminate(), to simulate races.
globalThis.fileSelectionQaWorkers = [];
globalThis.fileSelectionQaSignals = qaSignals;
globalThis.Worker = class {
  constructor() {this.terminated = false; globalThis.fileSelectionQaWorkers.push(this);}
  postMessage(request) {this.request = request;}
  terminate() {this.terminated = true;}
};
// Real FileSystemHandles are opaque objects, not proxied plain-object stores.
class SyntheticFileHandle {
  constructor(name) {this.kind="file";this.name=name;}
}
const files = ["kons60", "eks30"].map((protocol, i) => ({
  fileHandler: new SyntheticFileHandle(`synthetic-${i}.CTM`), name:`Synthetic ${protocol}`,
  sessionId:`Session ${i+1}`, subjectFirstName:"QA", subjectLastName:"Example", subjectId:`QA${i+1}`,
  date:"18.11.2026", time:"12:00", speed:i ? "30/30":"60/60", program:i ? "eks/eks":"kons/kons", legSide:"left",
}));
setFiles(files);
setSessions(files.map(file=>({sessionId:file.sessionId,files:[file]})));
render(()=><FileBrowser />,document.getElementById("root"));
