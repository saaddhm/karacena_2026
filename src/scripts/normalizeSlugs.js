import { Show, Venue, Artist, BlogPost } from '../models/index.js';
import { slugify, uniqueSlug } from '../utils/slug.js';

// One-time (idempotent) repair of existing rows whose slug is not URL-safe,
// e.g. a show slug saved as "« Voyez-vous le bateau net ? »". Runs at startup;
// rows already in canonical form are left untouched.
async function fixModel(model, titleFields) {
  const rows = await model.findAll();
  let fixed = 0;
  for (const row of rows) {
    let base = slugify(row.slug);
    if (!base) {
      for (const field of titleFields) {
        base = slugify(row[field]);
        if (base) break;
      }
    }
    if (!base) base = `item-${row.id}`;
    if (base !== row.slug) {
      // eslint-disable-next-line no-await-in-loop
      row.slug = await uniqueSlug(model, base, row.id);
      // eslint-disable-next-line no-await-in-loop
      await row.save({ hooks: false });
      fixed += 1;
    }
  }
  if (fixed) console.log(`✔ normalized ${fixed} ${model.name} slug(s)`);
}

export async function normalizeSlugs() {
  try {
    await fixModel(Show, ['titleFr', 'titleEn', 'titleAr']);
    await fixModel(Venue, ['nameFr', 'nameEn', 'nameAr']);
    await fixModel(Artist, ['name', 'nameAr']);
    await fixModel(BlogPost, ['titleFr', 'titleEn', 'titleAr']);
  } catch (e) {
    console.warn('⚠ slug normalization skipped:', e.message);
  }
}
