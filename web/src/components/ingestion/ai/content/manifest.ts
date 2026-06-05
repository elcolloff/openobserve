// Copyright 2026 OpenObserve Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// Placement manifest shipped with the content (datasource-ui-content/manifest.json),
// fetched into src/assets/ai-datasource-content/generated/ at build time. It tells
// the UI which tab (category) each rich card belongs to and in what order — so
// adding/moving a card is a content-repo-only change, no web edit required.

export interface ManifestEntry {
  /** Folder slug under datasource-ui-content/ — matches the markdown content. */
  slug: string;
  /** Sidebar label. */
  name: string;
  /** Tab slug this card belongs to (e.g. "model-providers"). */
  category: string;
  /** Sort order within the tab (ascending). */
  order?: number;
  /** "View full documentation" link; empty/omitted hides it. */
  docURL?: string;
  /** Sidebar search keywords. */
  keywords?: string[];
}

export interface ManifestCategory {
  /** Tab slug. Matches an existing tab to merge into it, or a new one to create it. */
  slug: string;
  /** Tab display name (used when creating a new tab). */
  label?: string;
  /** Tab position in the sidebar (ascending). */
  order?: number;
}

interface Manifest {
  version?: number;
  categories?: ManifestCategory[];
  integrations?: ManifestEntry[];
}

// Glob (rather than a static import) so an absent file in tests / pre-fetch
// simply yields an empty manifest instead of a build error. This dir also holds
// `.fetch.json` (our metadata), so pick the file by CONTENT — the one with an
// `integrations` array — rather than by path. Vite's glob keys differ between
// dev and build, so matching on the path string is unreliable.
const files = import.meta.glob(
  "@/assets/ai-datasource-content/generated/*.json",
  { import: "default", eager: true },
) as Record<string, Manifest>;

const manifest = Object.values(files).find(
  (m): m is Manifest => !!m && Array.isArray(m.integrations),
);

export const manifestIntegrations: ManifestEntry[] = manifest?.integrations ?? [];
export const manifestCategories: ManifestCategory[] = manifest?.categories ?? [];
