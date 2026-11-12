var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
let loaded = null;
/** The words of a load ask (`{ load: [...] }` in the request's header), or null for any other request. */
export function loadWords(request) {
    const words = request.load;
    return Array.isArray(words) && words.every((w) => typeof w === 'string') ? words : null;
}
/** Answers the ask with the tool at `tool` (imported on the first ask, then kept). */
export function serveLoad(incoming, words, tool) {
    // the module is the load tool: its export is checked by the call below, which a failure turns into the fallback
    loaded ??= import(__rewriteRelativeImportExtension(tool.href));
    const { env, cwd, ppid } = incoming.request;
    loaded.then((m) => incoming.reply(m.answerLoad(words, { env, cwd, ppid })))
        .catch(() => incoming.reply({ code: 0, stdout: '', stderr: '', fallback: 'ts' }));
}
