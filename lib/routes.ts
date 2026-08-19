import { isNativeApp } from './native';

// Links to id-addressed pages.
//
// The website uses path params — /recipes/abc — and those URLs are public:
// Family Kitchen's "Copy link" hands them out, so they must not change.
//
// A static export can't ship a path-param route: the ids are user data, so
// there is no list to prerender. The app therefore uses query-param twins of
// the same pages (/recipes/view?id=abc), which are a single static file that
// reads the id at runtime. Both shapes render the same component.
//
// Call these instead of writing the path by hand and the right one is used on
// each platform.

// Recipe and occasion ids are numbers, and a few call sites hold them as
// possibly-undefined. The template literals these replaced stringified whatever
// they were given, so this does the same rather than changing behaviour.
type Id = string | number | undefined;

const q = (path: string, key: string, value: Id) =>
  `${path}?${key}=${encodeURIComponent(String(value))}`;

export const recipeEditHref = (id: Id) =>
  isNativeApp() ? q('/recipes/edit', 'id', id) : `/recipes/${id}`;

export const recipeViewHref = (id: Id) =>
  isNativeApp() ? q('/recipes/view', 'id', id) : `/recipes/${id}/view`;

export const familyKitchenHref = (slug: Id) =>
  isNativeApp() ? q('/family-kitchens/kitchen', 'slug', slug) : `/family-kitchens/${slug}`;

export const familyKitchenAddHref = (slug: Id) =>
  isNativeApp() ? q('/family-kitchens/add', 'slug', slug) : `/family-kitchens/${slug}/add`;

export const heritageKitchenHref = (slug: Id) =>
  isNativeApp() ? q('/heritage-kitchen/kitchen', 'slug', slug) : `/heritage-kitchen/${slug}`;

export const printOccasionHref = (id: Id) =>
  isNativeApp() ? q('/print/occasion/view', 'id', id) : `/print/occasion/${id}`;
