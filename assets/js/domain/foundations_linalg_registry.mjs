// S4D5 Linalg-Registry: dünner Adapter über die zentrale Registry
// (keine eigene Runtime).
import { createFamilyRegistry } from './family_registry.mjs';
import { LINALG_FAMILY_SPECS } from '../core/foundations_linalg_families.mjs';

export { LINALG_FAMILY_SPECS };

export const LINALG_FAMILIES = createFamilyRegistry(LINALG_FAMILY_SPECS);
