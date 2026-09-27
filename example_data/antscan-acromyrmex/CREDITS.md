# Acromyrmex balzani micro-CT

A leafcutter ant worker, unstained, scanned by synchrotron micro-CT at KIT and
published by Antscan.

## Source

Specimen 1031, `CASENT0744618`, collected in São Paulo, Brazil.
<https://biomedisa.info/antscan/specimen/1031>

Antscan is a digital library of 3D invertebrate anatomy by Katzke, van de Kamp
& Economo. Katzke *et al.* (2026), *High-throughput phenomics of global ant
biodiversity*, Nat Methods 23, 663–672.
<https://doi.org/10.1038/s41592-026-03005-0>

**License: CC BY 4.0.** Attribution is required - credit Antscan and the paper
above.

| field | value |
|---|---|
| name | *Acromyrmex balzani* (Mayr, 1865) |
| subfamily / tribe | Myrmicinae / Attini |
| caste | worker |
| stained | no |
| voxel size (published) | 2.44 µm |
| filter | 500 µm Al |
| collection | `lsbf_234`, held at OIST |
| contributor | Rodrigo M. Feitosa |

## The file

| file | shape (z,y,x) | voxel | extent (z,y,x) |
|---|---|---|---|
| `acromyrmex-200x196x758.tif` | 758 × 196 × 200 | 9.76 µm | 7.4 × 1.9 × 2.0 mm |

8-bit, deflate-compressed, plain `(z, y, x)` stack.

## Where 9.76 µm comes from

The specimen page gives **2.44 µm** for the full-resolution scan, and 400 × 393
for the slice-viewer stack. It does not say what the viewer stack was
downsampled by.

The evidence says 2×, so 4.88 µm per preview voxel. At that size the 1516
slices span 7.4 mm, which is the right length for an *Acromyrmex* worker with
its antennae extended — 2.44 µm would make it 3.7 mm and 9.76 µm would make it
14.8 mm.

This file is box-averaged by 2 again, hence 9.76 µm. Treat the derived figure
as derived; 2.44 µm is the one the specimen page states.

## Why this specimen

It is the worked example in `notebooks/voxel_to_mesh.ipynb`. The legs,
antennae and hairs are a few voxels across, so every knob in that notebook —
threshold, blur, decimation — has something visible to destroy.

It also demonstrates the padding gotcha on its own. The legs and antennae run
off every face of the scan, so an unpadded extraction is open in a dozen
places.

## Reproducing this

Antscan publishes the slice viewer's PNG stack without an account; the
specimen page's own download button wants a login.

```sh
tools/make-ant-volume.py 1031 example_data/antscan-acromyrmex 2
```

That script's header records which stack it reads and why the output is sized
the way it is.
