# Ceratophrys ornata micro-CT

Three volumes of one Argentine horned frog, iodine-stained with Lugol's
solution and scanned by micro-CT: the head, the whole tongue, and a block cut
out of that tongue.

## Source

Kleinteich T, Gorb SN. *Data from: Frog tongue acts as muscle-powered adhesive
tape.* Dryad, 2015. <https://doi.org/10.5061/dryad.066mr>

Paper: *Frog tongue acts as muscle-powered adhesive tape.* R. Soc. open sci.
2:150333. <https://doi.org/10.1098/rsos.150333>

**License: CC0 1.0 Universal**, a public domain dedication. Attribution is not
legally required. Credit the authors anyway.

## The files

| file | shape (z,y,x) | voxel | extent (z,y,x) | source zip |
|---|---|---|---|---|
| `frog-head-256x256x195.tif` | 195 × 256 × 256 | 202 µm | 39.4 × 51.7 × 51.7 mm | `Ceratophrys_ornata_frogCT.zip` |
| `tongue-whole-256x141x227.tif` | 227 × 141 × 256 | 81 µm | 18.4 × 11.4 × 20.7 mm | `Ceratophrys_ornata_tongueCT.zip` |
| `tongue-block-256x256x256.tif` | 256 × 256 × 256 | 4.06 µm | 1.04 mm cube | `Ceratophrys_ornata_tongueTissueCT.zip` |

All three are 8-bit, deflate-compressed, plain `(z, y, x)` stacks.

Each is box-averaged down from the published slices, which are 1936 × 1936 ×
1476 at 26.68 µm, 936 × 516 × 830 at 22.14 µm, and 2172 × 2252 × 1541 at
0.867 µm. The tongue block is also cropped: a 1200³ cube taken from inside the
circular field of view, so the zero corners of each slice are left out.

The head scan covers the head and forelimbs. Dryad describes the source as "a
micro-CT scan of the head of a 70mm female".

## Reproducing these

Dryad serves a bot-check to non-browsers, so download the zips by hand first.
Both tools take `<zip> [out-dir] [across]` and write a `.raw` for the slides to
stream; the TIFFs here are those volumes transposed to `(z, y, x)`.

```sh
tools/make-frog-volume.py   Ceratophrys_ornata_frogCT.zip         static/data 256
tools/make-frog-volume.py   Ceratophrys_ornata_tongueCT.zip       static/data 256
tools/make-tongue-volume.py Ceratophrys_ornata_tongueTissueCT.zip static/data 256
```

`make-tongue-volume.py` is the one that crops. Its header and
`make-frog-volume.py`'s record why each volume is sized and windowed the way
it is.
