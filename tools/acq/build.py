#!/usr/bin/env python3
"""Regenerate the simulated acquisition data for the why-visualize deck.

    python3 tools/acq/build.py            # everything
    python3 tools/acq/build.py tomography # one modality

Each modality is one simulation that produces all three panels of its scene
from the same loop over the same specimen, so the panels cannot disagree
about what was measured. The scenes in static/js/viz/scenes/acq-*.js only
play the result back.

Output lands in static/data/acq/<name>/ and is committed - it is the deck's
content, not a build artefact, and a talk should not depend on numpy being
installed on the machine giving it.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# One entry per slide. sim_ptychotomo.py and sim_sectioning.py are not in
# this list: they are working simulations of phase-contrast tomography and
# of physical sectioning, kept because the deck may want them again, but the
# slides they were built for have been folded into the abstract versions.
MODALITIES = [
    'microscopy',       # a slice at a time, however the slice is made
    'tomography',       # projections in, volume computed out
    'photogrammetry',   # ordinary photographs, triangulated
    'rangescan',        # first return only, so surfaces
    'echo',             # whole waveform, so volumes
]


def main(names):
    import importlib
    for name in names:
        module = importlib.import_module(f'sim_{name}')
        module.run()


if __name__ == '__main__':
    wanted = sys.argv[1:] or MODALITIES
    unknown = [w for w in wanted if w not in MODALITIES]
    if unknown:
        sys.exit(f'unknown modality: {", ".join(unknown)}\n'
                 f'known: {", ".join(MODALITIES)}')
    print(f'simulating {len(wanted)} modalit'
          f'{"y" if len(wanted) == 1 else "ies"} ->  static/data/acq/')
    main(wanted)
