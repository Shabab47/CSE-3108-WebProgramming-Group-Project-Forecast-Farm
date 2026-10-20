/**
 * The preset profile pictures offered on `profile.html`.
 *
 * **Presets, not uploads, on purpose.** A profile picture is a small identity choice,
 * and the upload version needs a file picker, image decoding, canvas resizing,
 * compression, data-URL validation and browser-only tests to get one picture onto a
 * circle. A short list of fixed IDs gets the same choice with none of that surface. See
 * DEC-051.
 *
 * The art itself is inline SVG in `js/ui/avatarArt.js`; this file is the list the store
 * validates against and the UI renders. Keep the list and the art in step — an id with
 * no art falls back to the default gray person rather than crashing.
 */

export const AVATARS = [
  { id: 'farmer1', label: 'Farmer 1' },
  { id: 'farmer2', label: 'Farmer 2' },
  { id: 'farmer3', label: 'Farmer 3' },
];

/** Whether a value is one of the preset ids. `null` means the default avatar. */
export function isAvatarId(value) {
  return AVATARS.some((avatar) => avatar.id === value);
}
