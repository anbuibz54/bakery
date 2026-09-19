/**
 * The shop owner's accounts, as listed in OWNER_EMAILS. The cookbook schema is
 * shared by everyone who uses the cookbook, so anything the bakery reads from
 * it (recipes, receipts) must be limited to these accounts.
 *
 * No `next/*` imports.
 */

export function ownerEmails(): string[] {
  return (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}
