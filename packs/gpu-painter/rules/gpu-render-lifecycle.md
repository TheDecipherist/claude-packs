---
# concepts: painter, ui
paths:
  - "placeholder"
---

# The painter starts after the window exists, renders only while visible, and stops before anything is freed

<constraints>
Always do:
- Create the native view only once the editor's native peer exists and has bounds: on macOS a child `NSView` backed by a `CAMetalLayer` inside an `NSViewComponent`; on Windows a child `HWND` inside an `HWNDComponent`. Make the Dawn surface from it (`WGPUSurfaceSourceMetalLayer` / `WGPUSurfaceSourceWindowsHWND`).
- Configure the surface in pixels: logical size × `backingScaleFactor` (or the Windows DPI scale). Set the `CAMetalLayer`'s `contentsScale` yourself, because Dawn doesn't. Reconfigure on every resize and screen change.
- Handle every `GetCurrentTexture` status explicitly: `Outdated`, `Lost` and `SuccessSuboptimal` mean reconfigure; `Timeout` means skip this frame.
- Stop rendering (0 Hz) when the editor is closed, hidden, minimised or covered.
- Tear down in this order: stop the render thread and wait for its last frame, release the surface, then destroy the view.

Never do:
- Create the view in the editor's constructor before the peer exists.
- Keep rendering with the editor closed. A closed editor costs 0% render CPU.
- Free the view, layer or surface while the render thread may still present to it.
</constraints>

## Check
- `gpu-lifecycle-stress`: open and close the editor 100 times under AddressSanitizer with audio at 96 voices, then 8 copies at once. Pass: no reports, no leaks, render CPU 0 after the last close.
- Golden test at scale 2.0, plus a test that the surface texture size equals the view bounds × scale.
Lesson check for this rule: `gpu-no-frame-stalls`.
