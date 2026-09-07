export interface BreadcrumbItem {
  href?: string;
  label: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Brotkrumen" class="breadcrumbs">
      <ol>
        {items.map((item, index) => (
          <li aria-current={index === items.length - 1 ? 'page' : undefined} key={`${item.label}-${index}`}>
            {item.href ? <a href={item.href}>{item.label}</a> : item.label}
          </li>
        ))}
      </ol>
    </nav>
  );
}
