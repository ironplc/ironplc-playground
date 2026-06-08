// Web Worker that loads the WASM module and runs compile/run operations
// off the main thread so the UI stays responsive.
import init, { init_panic_hook, compile, run, run_source, load_program, step, reset_session, version, } from "./pkg/ironplc_playground.js";
let ready = false;
function post(msg) {
    self.postMessage(msg);
}
init()
    .then(() => {
    init_panic_hook();
    ready = true;
    post({ type: "ready", version: version() });
})
    .catch((err) => {
    post({ type: "error", error: `WASM init failed: ${err}` });
});
self.onmessage = (e) => {
    if (e.source && e.source !== self) {
        post({ type: "error", error: "Untrusted message source" });
        return;
    }
    const raw = e.data;
    if (!raw ||
        typeof raw !== "object" ||
        typeof raw.command !== "string") {
        post({ type: "error", error: "Invalid message payload" });
        return;
    }
    const data = raw;
    const id = data.id;
    if (!ready) {
        post({ id, type: "error", error: "WASM module not yet loaded" });
        return;
    }
    try {
        let json;
        switch (data.command) {
            case "compile":
                json = compile(data.source, data.dialect || "", data.allows || "");
                break;
            case "run":
                json = run(data.bytecodeBase64, data.scans);
                break;
            case "run_source":
                json = run_source(data.source, data.scans, data.dialect || "", data.allows || "");
                break;
            case "load_program":
                json = load_program(data.source, data.cycleTimeUs || 100000, data.dialect || "", data.allows || "");
                break;
            case "step":
                json = step(data.scans);
                break;
            case "reset":
                json = reset_session();
                break;
            default: {
                const _exhaustive = data;
                void _exhaustive;
                post({ id, type: "error", error: `Unknown command` });
                return;
            }
        }
        post({ id, type: "result", json });
    }
    catch (err) {
        post({ id, type: "error", error: String(err) });
    }
};
