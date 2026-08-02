// URL-safe slug utilities.
// A slug must be usable as a URL path segment: lowercase ASCII, digits and
// hyphens only — no spaces, accents, quotes, «guillemets» or '?' (which would
// otherwise be read as the start of a query string and break routing).

export function slugify(input) {
  return String(input ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')   // strip accents (é -> e)
    .toLowerCase()
    .replace(/[’'"«»`]/g, '') // drop quotes / guillemets
    .replace(/[^a-z0-9]+/g, '-')       // any run of other chars -> single hyphen
    .replace(/^-+|-+$/g, '')           // trim leading/trailing hyphens
    .slice(0, 180)
    .replace(/-+$/g, '');
}

// Return a slug unique within `model` (appends -2, -3, … on collision).
export async function uniqueSlug(model, base, selfId = null) {
  const safe = base || 'item';
  let candidate = safe;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (true) {
    const existing = await model.findOne({ where: { slug: candidate }, attributes: ['id'] });
    if (!existing || existing.id === selfId) return candidate;
    candidate = `${safe}-${n++}`;
  }
}

// Register a beforeValidate hook so every save produces a URL-safe, unique slug.
// If a slug is provided it is sanitised; otherwise one is derived from the
// first non-empty title field.
export function attachSlugHook(model, titleFields = []) {
  model.addHook('beforeValidate', async (instance) => {
    let base = slugify(instance.slug);
    if (!base) {
      for (const field of titleFields) {
        base = slugify(instance[field]);
        if (base) break;
      }
    }
    if (!base) base = `item-${Date.now().toString(36)}`;
    instance.slug = await uniqueSlug(model, base, instance.id ?? null);
  });
}
