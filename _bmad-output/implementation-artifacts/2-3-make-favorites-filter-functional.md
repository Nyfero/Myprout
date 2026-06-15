# Story 2.3: Make Favorites Filter Functional

Status: ready-for-dev

## Story

As a user,
I want to filter my vault to show only starred entries,
so that I can quickly find my most-used passwords.

## Acceptance Criteria

1. Clicking a favorites filter toggle shows only entries with `is_stared: true`. The toggle shows a visual active state.
2. Clicking the toggle again shows all entries (filter deactivated). The toggle returns to its inactive visual state.
3. When the favorites filter is active and there are no starred entries, an empty state message is shown (no error, no crash).
4. `npx vitest run` passes after all changes (backend — no frontend tests in scope).

## Tasks / Subtasks

- [ ] Update `frontend/src/components/passwords/composables/usePasswords.js` (AC: 1, 2, 3)
  - [ ] Add `showOnlyFavorites = ref(false)` reactive state
  - [ ] Update `filteredPasswords` computed to filter by `is_stared` when `showOnlyFavorites` is true
  - [ ] Add `toggleFavoritesFilter` function
  - [ ] Export `showOnlyFavorites` and `toggleFavoritesFilter`
- [ ] Update `frontend/src/components/passwords/PasswordsList.vue` (AC: 1, 2, 3)
  - [ ] Uncomment and repurpose the existing commented-out filter button as a favorites toggle
  - [ ] Bind it to `toggleFavoritesFilter` and `showOnlyFavorites`
  - [ ] Add active visual state (CSS class or inline style)
  - [ ] Destructure `showOnlyFavorites` and `toggleFavoritesFilter` from `usePasswords()`
- [ ] Verify no regression (AC: 4)
  - [ ] Run `npx vitest run` from `backend/`

## Dev Notes

### Current State Analysis

**`usePasswords.js` — what exists:**
- `toggleFavorite(id)` — works correctly (optimistic update + PATCH API). Do NOT touch this.
- `filteredPasswords` computed — filters by `search` only. Needs to also filter by `is_stared` when active.
- `showOnlyFavorites` — does NOT exist yet.

**`PasswordsList.vue` — what exists:**
- Search input (`v-model="search"`) in `.filter-wrap` div — works, keep untouched.
- A commented-out filter button (lines 21-23) — repurpose this as the favorites filter.
- `filteredPasswords` and `groupedPasswords` already used in template — the computed change in `usePasswords.js` is all that's needed for the filtering logic.

**`PasswordsCard.vue` — what exists:**
- Star button already shows `star`/`star_border` and has `.active` class CSS — nothing to change here.

**`PasswordsAlphabet.vue` — no changes needed.**

---

### Changes to usePasswords.js

**Add after `const search = ref('')`:**
```javascript
const showOnlyFavorites = ref(false)

function toggleFavoritesFilter() {
  showOnlyFavorites.value = !showOnlyFavorites.value
}
```

**Replace the existing `filteredPasswords` computed** (lines 17-25):

Current:
```javascript
const filteredPasswords = computed(() => {
  if (!search.value) return passwordsList.value
  const q = search.value.toLowerCase()
  return passwordsList.value.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q)
  )
})
```

Replace with:
```javascript
const filteredPasswords = computed(() => {
  let list = passwordsList.value

  if (showOnlyFavorites.value) {
    list = list.filter((p) => p.is_stared)
  }

  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q)
    )
  }

  return list
})
```

**Add to the return object** at the bottom of `usePasswords()`:
```javascript
return {
  // ... existing returns ...
  showOnlyFavorites,
  toggleFavoritesFilter,
}
```

**Note:** The favorites filter and search filter stack — if both are active, only starred entries matching the search are shown. This is the natural behavior; no special handling needed.

---

### Changes to PasswordsList.vue

**Step 1: Destructure new exports from `usePasswords()`**

In the `<script setup>` block, update the destructuring (around line 91):
```javascript
const {
  passwordsList,
  loading,
  search,
  visiblePasswords,
  icons,
  filteredPasswords,
  groupedPasswords,
  extractDomain,
  toggleFavorite,
  toggleShowPassword,
  decryptForCopy,
  createPassword,
  updatePassword,
  deletePassword,
  fetchPasswordsList,
  showOnlyFavorites,        // ADD
  toggleFavoritesFilter,    // ADD
} = usePasswords()
```

**Step 2: Repurpose the commented-out filter button**

Find lines 21-23 in the template (inside `.filter-wrap`):
```html
<!-- <button class="themed-button button-secondary filter-btn">
  <span class="material-icons">filter_list</span>
</button> -->
```

Replace with:
```html
<button
  class="themed-button button-secondary filter-btn"
  :class="{ 'filter-btn-active': showOnlyFavorites }"
  @click="toggleFavoritesFilter"
  title="Afficher uniquement les favoris"
>
  <span class="material-icons">{{ showOnlyFavorites ? 'star' : 'star_border' }}</span>
</button>
```

**Step 3: Add CSS for active state**

In the `<style scoped>` section, add after `.filter-btn`:
```css
.filter-btn-active {
  color: #f9f0a8;
  border-color: #f9f0a8;
}
```

**Note on existing `.filter-btn` CSS:** Lines 261-265 already define `.filter-btn` with `flex: 1; margin: 8px 0px; padding: 10px;`. The new `.filter-btn-active` class adds the active visual state on top of that. No need to change the existing `.filter-btn` style.

---

### Empty State Handling

When `showOnlyFavorites` is true and no passwords are starred, `filteredPasswords.length === 0` will be true and the existing empty state template will trigger:

```html
<div v-else-if="filteredPasswords.length === 0" class="empty">
  Aucun mot de passe
</div>
```

This satisfies AC-3 naturally. Optionally, the message could say "Aucun favori" when `showOnlyFavorites` is active — but this is cosmetic. Keep "Aucun mot de passe" for simplicity; do not over-engineer.

---

### What Must NOT Change

- `toggleFavorite(id)` in `usePasswords.js` — already works correctly (optimistic update + PATCH)
- `PasswordsCard.vue` — no changes at all
- `PasswordsAlphabet.vue` — no changes at all
- The search input functionality — `filteredPasswords` computed now handles both search and favorites, so search still works exactly as before
- `groupedPasswords` — unchanged, it derives from `filteredPasswords` and will automatically respect the favorites filter

---

### Backend: No Changes Needed

The `PATCH /:id/is_stared` endpoint already exists and works correctly. The `GET /` endpoint returns `is_stared` in the password objects. No backend modifications for this story.

---

### Handle Null/Undefined title Safely

The existing `filteredPasswords` computed calls `p.title.toLowerCase()` without null guard. In the replacement, use `p.title?.toLowerCase()` (already shown in the code above) — the `?.` operator prevents crashes if `title` is null (it's nullable in the Prisma schema: `title String?`).

---

### References

- [Source: frontend/src/components/passwords/composables/usePasswords.js:17-25] Current filteredPasswords computed — no favorites filter
- [Source: frontend/src/components/passwords/PasswordsList.vue:21-23] Commented-out filter button to repurpose
- [Source: frontend/src/components/passwords/PasswordsList.vue:91-107] usePasswords destructuring to update
- [Source: frontend/src/components/passwords/PasswordsCard.vue] Star button and .active CSS — already implemented, no changes
- [Source: backend/src/routes/passwords.ts:67-80] PATCH /:id/is_stared — already works, no changes
- [Source: backend/prisma/schema.prisma] is_stared Boolean @default(false) — field exists, kept after Story 2.1

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List

- `frontend/src/components/passwords/composables/usePasswords.js` (MODIFY — add showOnlyFavorites, toggleFavoritesFilter, update filteredPasswords)
- `frontend/src/components/passwords/PasswordsList.vue` (MODIFY — add destructuring, repurpose filter button, add CSS)
