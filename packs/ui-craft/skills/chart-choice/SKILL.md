---
name: chart-choice
description: Use when a screen needs a chart or a figure, or a chart looks wrong, cluttered or unclear.
---

# Pick the chart from the question (one job: the plainest form that answers it)

| Question | Form |
|---|---|
| Is it moving over time? | One 2px line, straight, no markers; an area only with a fill of 15% or less |
| How much per period? | Columns with square corners |
| How is it distributed? | A histogram with equal bins |
| Who ranks? | A sorted horizontal bar list |
| What share? | A thin ring, or a 100% stacked bar; five parts at most, legend as a table |
| How far to the target? | A progress bar, both ends labelled, the fill the true ratio |
| Has it drifted from target? | One row per part: a bar with a 1px tick at the target |
| Where? | A map with a list beside it; the list carries the magnitudes |
| Which way did it flow? | Columns above and below one zero line, the axis signed and captioned |

<constraints>
Always do:
- Ask whether it needs a chart: four of the 23 studied screens draw none, because a few numbers say it.
- Show one series per chart, three at most; switch metrics with a control, not by overlaying lines.
- Use 3-5 faint gridlines, no y-axis line, round ticks above the maximum, no legend for a single series.
- Draw a plot about 112-264px tall. A series flat except for one event gets two-thirds of the width, with the event annotated.
- Dash a forecast after today, and label its end value.
- Encode it in the chart if a caption has to say which bars are which.
- Draw an empty chart: the zero line, missing bars for empty periods, one sentence.

Never do:
- Use a hue per bar, or more than four hues on a screen.
- Smooth a line with a spline, or put a dot on every point.
- Use a fat donut with labels on the slices.
</constraints>
