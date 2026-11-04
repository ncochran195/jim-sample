import type { Page } from "@playwright/test";

/**
 * Does what a user would do in the browser's developer tools to get past
 * client-side checks: removes `required` from the input labelled `label`
 * and, when `type` is given, changes its type (for example "date" to "text").
 */
export async function loosenInput(
  page: Page,
  label: string,
  options: { removeRequired?: boolean; type?: string },
): Promise<void> {
  await page.getByLabel(label, { exact: true }).evaluate(
    (input, { removeRequired, type }) => {
      if (removeRequired) input.removeAttribute("required");
      if (type) input.setAttribute("type", type);
    },
    { removeRequired: options.removeRequired ?? false, type: options.type },
  );
}
