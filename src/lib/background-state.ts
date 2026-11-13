export const backgroundState = {
  zoom: 1,
  /**
   * Target colours for the liquid background (color1–color4). null = the default palette.
   * The background eases to new colours smoothly; its motion and effects don't change.
   */
  colors: null as readonly [string, string, string, string] | null,
};
