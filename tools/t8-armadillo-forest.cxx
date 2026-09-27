/* Build an adaptive forest of octrees over the Armadillo's real surface,
 * using t8code (github.com/DLR-AMR/t8code) - not a from-scratch octree
 * builder, the actual library the deck's "t8code" slide is about.
 *
 * The refinement criterion reuses static/data/armadillo-voxels.bin, the
 * same 64^3 surface-occupancy grid tools/make-armadillo-voxels.py computed
 * for the three.js octree-build scene: refine a cell if it touches the
 * Armadillo's real triangle surface, up to level 6 (2^6 = 64, so a level-6
 * cell lines up exactly with one voxel). Starting from a single coarse cube
 * and refining only where the surface says to is t8code's own point: a mesh
 * that is adaptive from construction, not simplified after the fact.
 */
#include <t8.h>
#include <t8_cmesh/t8_cmesh.h>
#include <t8_cmesh/t8_cmesh_examples.h>
#include <t8_forest/t8_forest_general.h>
#include <t8_forest/t8_forest_io.h>
#include <t8_forest/t8_forest_geometrical.h>
#include <t8_schemes/t8_default/t8_default.hxx>

#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <vector>

static const int MAX_LEVEL = 6;
static int GRID_N = 0;
static std::vector<unsigned char> occupancy;  // one byte per cell, 0/1

/* Does any occupied grid cell fall in the [i0,i0+cells) box on each axis?
 * Mirrors touchesSurface() in static/js/viz/scenes/octree-build.js exactly -
 * same occupancy grid, same "any underlying cell in range" test, so a level
 * that only touches a corner of the surface still counts as touching. */
static bool
touches_surface_box (int i0, int j0, int k0, int cells)
{
  for (int i = 0; i < cells; i++) {
    int gi = i0 + i;
    for (int j = 0; j < cells; j++) {
      int gj = j0 + j;
      size_t row = ((size_t) gi * GRID_N + gj) * GRID_N;
      for (int k = 0; k < cells; k++) {
        if (occupancy[row + k0 + k]) return true;
      }
    }
  }
  return false;
}

static void
load_occupancy (const char *path)
{
  FILE *f = fopen (path, "rb");
  if (!f) { fprintf (stderr, "cannot open %s\n", path); exit (1); }
  uint32_t n;
  if (fread (&n, sizeof (n), 1, f) != 1) { fprintf (stderr, "short read\n"); exit (1); }
  GRID_N = (int) n;
  size_t total = (size_t) n * n * n;
  size_t nbytes = (total + 7) / 8;
  std::vector<unsigned char> packed (nbytes);
  if (fread (packed.data (), 1, nbytes, f) != nbytes) { fprintf (stderr, "short read\n"); exit (1); }
  fclose (f);
  occupancy.assign (total, 0);
  for (size_t idx = 0; idx < total; idx++) {
    unsigned char byte = packed[idx >> 3];
    occupancy[idx] = (byte >> (7 - (idx & 7))) & 1;
  }
  fprintf (stderr, "loaded %dx%dx%d occupancy grid from %s\n", GRID_N, GRID_N, GRID_N, path);
}

/* which_tree/tree_class unused: a single hex tree, nothing else to check. */
static int
adapt_callback (t8_forest_t forest, t8_forest_t forest_from, t8_locidx_t which_tree,
                [[maybe_unused]] t8_eclass_t tree_class, [[maybe_unused]] t8_locidx_t lelement_id,
                const t8_scheme *scheme, [[maybe_unused]] const int is_family,
                [[maybe_unused]] const int num_elements, t8_element_t *elements[])
{
  const int level = scheme->element_get_level (tree_class, elements[0]);
  if (level >= MAX_LEVEL) {
    return 0;
  }
  double centroid[3];
  t8_forest_element_centroid (forest_from, which_tree, elements[0], centroid);
  /* The hypercube tree spans [0,1]^3 and refines as a regular octree, so a
   * level-L element is an axis-aligned cube of side 1/2^L; its min corner is
   * half a side below its centroid on each axis. The occupancy grid covers
   * the same cube (just shifted to be centred on the origin in world space,
   * which does not change any *fraction* of the cube), at a fixed 64^3
   * resolution - so a level-L cell lines up with exactly (64 >> L) grid
   * cells per axis, at the same fractional position. */
  const double h = 1.0 / (1 << level);
  const int cells = GRID_N >> level;
  auto to_index = [&] (double c) {
    int idx = (int) std::lround ((c - h / 2) * GRID_N);
    if (idx < 0) idx = 0;
    if (idx > GRID_N - cells) idx = GRID_N - cells;
    return idx;
  };
  if (touches_surface_box (to_index (centroid[0]), to_index (centroid[1]), to_index (centroid[2]), cells)) {
    return 1;
  }
  return 0;
}

int
main (int argc, char **argv)
{
  if (argc < 3) {
    fprintf (stderr, "usage: %s armadillo-voxels.bin out-prefix\n", argv[0]);
    return 1;
  }
  sc_init (sc_MPI_COMM_WORLD, 1, 1, NULL, SC_LP_ESSENTIAL);
  t8_init (SC_LP_PRODUCTION);

  load_occupancy (argv[1]);

  t8_cmesh_t cmesh;
  t8_cmesh_init (&cmesh);
  t8_cmesh_new_hypercube (&cmesh, T8_ECLASS_HEX, sc_MPI_COMM_WORLD, 0, 0, 0);

  t8_forest_t forest = t8_forest_new_uniform (cmesh, t8_scheme_new_default (), 0, 0, sc_MPI_COMM_WORLD);
  t8_global_productionf ("Built coarse (level 0) forest: %lli elements\n",
                          (long long) t8_forest_get_global_num_leaf_elements (forest));

  forest = t8_forest_new_adapt (forest, adapt_callback, 1, 0, NULL);
  t8_global_productionf ("Adapted forest: %lli elements (max level %d)\n",
                          (long long) t8_forest_get_global_num_leaf_elements (forest), MAX_LEVEL);

  t8_forest_write_vtk (forest, argv[2]);
  t8_global_productionf ("Wrote %s.pvtu / %s_0.vtu\n", argv[2], argv[2]);

  t8_forest_unref (&forest);
  sc_finalize ();
  return 0;
}
