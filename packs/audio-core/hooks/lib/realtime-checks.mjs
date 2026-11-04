import { blankCode, findAudioBodies, lineAt } from './cpp-scan.mjs';

// Each check: a pattern searched inside audio-thread bodies, and the reason shown to Claude.
export const CHECKS = [
  { re: /\bnew\b(?!\s*\()/g, why: 'heap allocation (`new`)' },
  { re: /\bdelete\b/g, why: 'heap deallocation (`delete`)' },
  { re: /\b(malloc|calloc|realloc|free)\s*\(/g, why: 'C heap call' },
  { re: /\bmake_(unique|shared)\b/g, why: 'heap allocation (make_unique/make_shared)' },
  { re: /\.\s*(push_back|emplace_back|push_front|emplace|insert|resize|reserve|assign)\s*\(/g, why: 'container growth may allocate' },
  { re: /\b(ScopedLock|GenericScopedLock|CriticalSection|lock_guard|unique_lock|scoped_lock|shared_lock|condition_variable|WaitableEvent)\b/g, why: 'lock or wait' },
  { re: /\bstd::(recursive_|shared_)?mutex\b/g, why: 'mutex' },
  { re: /\b(sleep_for|sleep_until|Thread::sleep)\b/g, why: 'sleep' },
  { re: /\b(DBG|printf|fprintf|fopen)\s*\(|std::(cout|cerr)|\bLogger::/g, why: 'I/O or logging' },
  { re: /\b(File|FileInputStream|FileOutputStream|ifstream|ofstream)\b/g, why: 'file I/O' },
  { re: /\b(juce::)?String\b|std::string\b|std::to_string\b/g, why: 'string building allocates' },
  { re: /\b(throw|catch)\b/g, why: 'exceptions (`throw`/`catch`)' },
  { re: /\bstd::function\b/g, why: '`std::function` may allocate on assignment' },
  { re: /\bstd::(unordered_)?(map|set|multimap)\b/g, why: 'node-based container allocates' },
  { re: /\bstd::(rand|random_device)\b|\brand\s*\(/g, why: 'rand/random_device may lock or syscall; use a per-voice PRNG state' },
  { re: /\bgl[A-Z]\w*\s*\(|\bid\s*<\s*MTL\w*|\bMTL[A-Z]\w*|\bwgpu\w*\s*\(|\bwgpu::|\bbgfx::/g, why: 'GPU API call from the audio thread; hand data over via the SPSC ring' },
  { re: /\b(PerformanceCounter|MessageManagerLock)\b/g, why: 'logs to I/O or takes the message lock' },
  { re: /\.\s*setProperty\s*\(/g, why: 'ValueTree::setProperty fires listeners synchronously on this thread' },
  { re: /\b(repaint|triggerAsyncUpdate|getActiveEditor|sendChangeMessage|callAsync)\s*\(|\bMessageManager\b/g, why: 'UI/message-thread call from audio thread' },
  { re: /\b(getRawParameterValue|getParameter)\s*\(/g, why: 'parameter lookup by ID; cache the pointer in the constructor' },
  { re: /\b(44100|48000|88200|96000|192000)(\.0f?)?\b/g, why: 'hard-coded sample rate; use the rate from prepareToPlay' },
];

const ESCAPE = /\/\/\s*rt-ok:/;

// Returns [{ line, func, why, text }] for one file's source.
export function findViolations(src) {
  const code = blankCode(src);
  const lines = src.split('\n');
  const found = [];
  for (const body of findAudioBodies(code)) {
    const slice = code.slice(body.start, body.end + 1);
    for (const { re, why } of CHECKS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(slice)) !== null) {
        const line = lineAt(src, body.start + m.index);
        const text = (lines[line - 1] ?? '').trim();
        if (ESCAPE.test(text)) continue;
        found.push({ line, func: body.name, why, text });
      }
    }
    if (body.name === 'processBlock' && !/\bScopedNoDenormals\b/.test(slice)) {
      const line = lineAt(src, body.start);
      found.push({ line, func: body.name, why: 'missing `juce::ScopedNoDenormals noDenormals;` at the top', text: 'processBlock' });
    }
  }
  return found;
}

// Key that survives line shifts, so only violations an edit adds are reported.
export const violationKey = (v) => `${v.func}|${v.why}|${v.text}`;
