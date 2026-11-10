---
name: gpu-capture
description: Use when a planet, glow, traveller or text renders wrong, or GPU time is high and the frame bench alone doesn't show why.
---

# GPU capture (one job: get a frame capture of one scene)

## Steps
1. Build the debug painter with labels on every pipeline and pass (`use_user_defined_labels_in_backend`).
2. **Mac:** run with `MTL_CAPTURE_ENABLED=1` and `DAWN_TRACE_FILE_BASE=captures/<scene>-<date>`. Dawn writes a `.gputrace` through `MTLCaptureManager`. Load the named scene and trigger the capture for N frames (default 3).
3. **Windows:** run under PIX with `WinPixEventRuntime.dll` next to the executable; Dawn emits PIX begin/end markers from the labels. Dawn's own D3D12 trace isn't implemented, so PIX is the tool.
4. Tell the user the capture path, and that it opens in Xcode (Mac) or PIX (Windows).

## Report
Capture path, scene, frame count, build and backend. Don't analyse the capture in this skill.
