# Character preview repair evidence

These images are the acceptance record for the August 14, 2026 Dance Off
character-card repairs. Columns are read left to right.

- `sandy-before-after.png`: opaque eye/lash alpha on the left; accepted
  alpha-cutout result on the right.
- `mario-ab-comparison.png`: closed bind eyelids; rejected eyelid
  repositioning; accepted removal of the two alternate closed-lid meshes.
- `sonic-before-after.png`: closed facial-bone rest pose; accepted calibrated
  open-eye rest pose.
- `larry-before-after.png`: the incorrect shared Z-up correction; accepted
  Y-up, front-facing orientation.
- `larry-browser-default-rotated.png`: accepted live card at the default
  orbit and after a horizontal drag. Larry remains upright in both.

The character renderer remains shared. Every accepted difference is declared
in `assets/character-packs.json`, and the same display rules are consumed by
the official runtime and the browser-preview exporter.
