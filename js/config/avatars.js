/**
 * The preset profile pictures offered during sign-up and on `profile.html`.
 *
 * **Presets, not uploads, on purpose.** A profile picture is a small identity choice,
 * and the upload version needs a file picker, image decoding, canvas resizing,
 * compression, data-URL validation and browser-only tests to get one picture onto a
 * circle. A fixed set of IDs gets the same choice with none of that surface. See DEC-051.
 *
 * The art itself is inline SVG in `js/ui/avatarArt.js`; this file is the list the store
 * validates against and the UI renders. Keep the two in step — an id with no art falls
 * back to the default gray person rather than crashing.
 */

export const AVATARS = [
  { id: 'farmer1', label: 'Farmer 1' },
  { id: 'farmer2', label: 'Farmer 2' },
  { id: 'farmer3', label: 'Painter' },
  { id: 'farmer4', label: 'Party Guy' },
  { id: 'farmer5', label: 'Neta Yahoo' },
  { id: 'farmer6', label: 'Boltu' },
  { id: 'farmer7', label: 'Apa' },
];

/** Whether a value is one of the preset ids. `null` means the default avatar. */
export function isAvatarId(value) {
  return AVATARS.some((avatar) => avatar.id === value);
}
