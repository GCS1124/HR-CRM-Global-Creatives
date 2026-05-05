import type { NavGroup } from "../types/navigation";

export interface GroupedItems<T> {
  group?: NavGroup;
  items: T[];
}

const groupOrder: NavGroup[] = ["Overview", "People", "Operations", "Finance", "Configuration"];

export function groupItems<T extends { group?: NavGroup }>(items: T[]): Array<GroupedItems<T>> {
  const grouped = new Map<NavGroup, T[]>();
  const ungrouped: T[] = [];

  for (const item of items) {
    if (!item.group) {
      ungrouped.push(item);
      continue;
    }

    const next = grouped.get(item.group) ?? [];
    next.push(item);
    grouped.set(item.group, next);
  }

  const sections: Array<GroupedItems<T>> = [];

  for (const group of groupOrder) {
    const itemsForGroup = grouped.get(group);
    if (itemsForGroup && itemsForGroup.length > 0) {
      sections.push({ group, items: itemsForGroup });
    }
  }

  for (const [group, itemsForGroup] of grouped.entries()) {
    if (!groupOrder.includes(group) && itemsForGroup.length > 0) {
      sections.push({ group, items: itemsForGroup });
    }
  }

  if (ungrouped.length > 0) {
    sections.push({ items: ungrouped });
  }

  return sections;
}
