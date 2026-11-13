# Find the controls in artwork

For `analyse-reference-look`, where controls are located in a picture by script.

- **Star-shaped knobs:** find each by a distance transform of the mask: the knob's centre is the peak, its radius the peak's value. A threshold alone merges neighbours.
- **Controls by shape:** classify each region by its shape (round, rectangular, slider, key) and draw the found shapes over the picture as an overlay. The overlay is the proof: every control is outlined and none is missing or doubled; read it before the list is trusted.
- **Lock the layout:** when the final extracted layout matches the overlay, write it to a file and lock it. A later step reads that file and never re-extracts.
