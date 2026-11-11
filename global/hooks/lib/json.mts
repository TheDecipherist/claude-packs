// The one JSON reader is base's. This line lets the global hooks run from the kit's own folder; `global add` installs the reader itself (lib/global.mts).
export { parseJson } from '../../../packs/base/hooks/lib/json.mts';
