// The sound-design pack's checks (0.28.0), fired through the base lesson-checks hook (the pack needs audio-core).
import { audioPacksInstall, holdsEachCaseIn } from '../lesson-cases.mts';

holdsEachCaseIn(audioPacksInstall, [
  ['sound-design', 'src/noise.cpp', 'std::mt19937 rng{std::random_device{}()};\n', 'std::mt19937 rng{kNoiseSeed};\n', 'audio-core'],
  ['sound-design', 'src/voice.cpp', 'cut += kt * (note - 60) / 12.0;\n', 'cut += kt * (note - kKeyAnchor) / 12.0;\n', 'audio-core'],
  ['sound-design', 'src/fx.cpp', 'out = wet * mix;\n', 'out = dry * c + wet * s;\n', 'audio-core'],
]);
