---
# concepts: painter
paths:
  - "placeholder"
---

# One Dawn device per process, one render thread, and every GPU call on it

<constraints>
Always do:
- Keep one process-wide, reference-counted `wgpu::Instance` and `wgpu::Device` shared by every plugin instance. The last editor or processor to release it destroys the device and joins Dawn's worker threads, before the plugin bundle can unload.
- Run every command encoder, `GetCurrentTexture` and `Present` on the one render thread. Encoders are never thread-safe, and a Fifo present blocks its thread.
- Use `CallbackMode::AllowProcessEvents` or `WaitAnyOnly` for every async call, and pump events on the render thread.
- Install both the device-lost callback and the uncaptured-error callback. On device loss, rebuild the device and every GPU resource, and the frame must come back on its own.
- Present with `PresentMode::Fifo`. On Metal, Dawn treats Fifo and Mailbox the same.

Never do:
- Use `CallbackMode::AllowSpontaneous`. Callbacks then fire on any thread, and calling back into the API from them is undefined behaviour.
- Present or encode on the message thread or the audio thread.
- Rely on `ImplicitDeviceSynchronization` to make multi-threaded use safe. Dawn's own docs call it heavy-handed, with deadlock risk.
</constraints>

## Check
- `.claude/checks/dawn-no-spontaneous.json` and `dawn-present-on-render-thread.json` block the forbidden patterns.
- Test: force `device.Destroy()` mid-session. Pass: the frame comes back and no errors are left unhandled.
- `gpu-lifecycle-stress`: zero Dawn threads remain after the last release.
Lesson checks for this rule: `dawn-no-spontaneous`, `dawn-present-on-render-thread`.
