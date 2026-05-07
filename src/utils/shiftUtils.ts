/**
 * Tag-based linking between transactions and work shifts. A transaction
 * paid for a shift carries a `shift-link:<shiftId>` tag — same pattern as
 * the subscription link, no schema change.
 */

export const SHIFT_LINK_PREFIX = 'shift-link:';

export function getShiftLinkId(tags: string[] | null | undefined): string | null {
  const tag = tags?.find((t) => t.startsWith(SHIFT_LINK_PREFIX));
  return tag ? tag.slice(SHIFT_LINK_PREFIX.length) : null;
}

/** Add (or replace) the shift-link tag. Removes any prior shift-link first. */
export function addShiftLink(tags: string[] | null | undefined, shiftId: string): string[] {
  const cleaned = (tags ?? []).filter((t) => !t.startsWith(SHIFT_LINK_PREFIX));
  return [...cleaned, `${SHIFT_LINK_PREFIX}${shiftId}`];
}

export function removeShiftLink(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter((t) => !t.startsWith(SHIFT_LINK_PREFIX));
}

export function isLinkedToShift(tags: string[] | null | undefined): boolean {
  return !!tags?.some((t) => t.startsWith(SHIFT_LINK_PREFIX));
}
