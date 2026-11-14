// Browser shim: Umi's http-fetch imports node-fetch; the browser already has fetch.
export default (...args) => globalThis.fetch(...args);
