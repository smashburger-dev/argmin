// Pure scene registry for compile-time validation. .fig.json files reference
// scenes by id; tools/compile_content.mjs uses this map to fail closed.
import * as smoothie from './smoothie.mjs';

export const scenes = { [smoothie.id]: smoothie };
