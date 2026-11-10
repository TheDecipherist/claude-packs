# The switch gate and the hover gate: read what was redrawn

Why a snapshot cannot be the test: `createComponentSnapshot` and a fresh paint of the editor repaint everything, so a parent that applies a child's look inside its own `paint` shows the new look there, while the live window never ran that paint. The gate reads what the toolkit was asked to redraw after the click, then runs that queued paint and reads the result.

## The peer that records

A test window needs a peer that logs the rectangles passed to `repaint` and can run the queued paint on request. Keep it in the project's one gate harness (`cpp-gates-share-one-reader`); a headless test peer usually exists already, so add the log to it.

```cpp
// in the harness's peer: every region the toolkit was asked to redraw
void repaint (const juce::Rectangle<int>& area) override
{
    asked.push_back (area);              // what the window would redraw
    juce::ComponentPeer::repaint (area);
}
juce::RectangleList<int> askedRegion() const { juce::RectangleList<int> r; for (auto& a : asked) r.add (a); return r; }
void clearAsked() { asked.clear(); }
// paint exactly the queued regions into the retained image, as the window would
juce::Image drawQueued (juce::Component& editor);
```

## The switch gate (one switch; the rest are the same template, `test-the-template-once`)

```cpp
for (const bool on : { false, true })                       // off then on: both ways
{
    peer.clearAsked();
    harness::clickAtCentre (peer, switchComponent);          // the real input, at the peer
    // no hover, no resize, no second click between the click and the reads
    const auto asked = peer.askedRegion();
    for (auto* governed : card.governedBySwitch())           // every component the switch governs
    {
        const auto inEditor = editor.getLocalArea (governed, governed->getLocalBounds());
        CHECK (asked.containsRectangle (inEditor));          // it was asked to redraw
        CHECK (governed->getAlpha() == (on ? 1.0f : dimmed)); // and holds the new state
        CHECK (governed->isEnabled() == on);                 // whichever the switch sets
    }
    const auto drawn = peer.drawQueued (editor);             // run the queued paint only
    CHECK (pixelsShow (drawn, card, on));                    // the pixels of the new state
}
```

The state is read from the components (alpha, enabled, visible) and from the pixels of the queued paint, never from a snapshot.

## The hover gate

```cpp
harness::moveTo (peer, outsideContainer);
for (auto* child : container.getChildren())
{
    harness::moveTo (peer, centreOf (*child));               // the pointer onto the child
    CHECK (container.hoverShown());                          // the hover is kept
}
harness::moveTo (peer, outsideContainer);
CHECK (! container.hoverShown());                            // leaving the bounds clears it
```

## The planted twins (compiled only in the test build, `cpp-faults-only-in-the-test-build`)

- Switch: `plantLookInParentPaint` moves the `setAlpha` loop into the parent's `paint` and drops the repaint of the governed components. The switch gate goes red: the governed components are outside the redrawn region and keep their old alpha.
- Hover: `plantHoverFromOwnEnterExit` drives the flag from the container's `mouseEnter` and `mouseExit` alone. The hover gate goes red on the first child.

Keep both red results with the green ones.
