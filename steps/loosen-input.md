# Loosen an input

**Purpose:** stand in for editing a form field in the browser's developer tools, so a server-side check can be tested: remove its `required` attribute and/or change its `type`.

**Inputs:** `page`; `label`, the field's exact label; `options.removeRequired`; `options.type`, the new input type (such as `"text"`).

**Outputs:** none. Only the field in the current page changes; reloading undoes it.

**Preconditions:** the page shows a field with that label.

**Flakiness:** none.
