# Shared Components

This directory contains reusable components that eliminate code duplication across the Tarkov Price Checker application.

## ItemTable Component

A unified table component that handles all item display tables throughout the application with consistent styling and functionality.

### Features

- **Consistent Design**: Light and dark theme support
- **Price Change Display**: Automatic price change percentage calculation and coloring
- **Flexible Data Sources**: Supports multiple data formats (weapon parts, required items, quest items)
- **External Links**: Optional wiki links for items
- **Image Handling**: Robust image loading with error handling
- **Responsive**: Consistent column widths and mobile-friendly design

### Usage

```tsx
import { ItemTable, type TableItem } from './shared'

const items: TableItem[] = [
  {
    id: 'item-1',
    image: 'https://example.com/item.png',
    name: 'Item Name',
    shortName: 'Short',
    count: 2,
    unitPrice: 50000,
    totalPrice: 100000,
    changeLast48hPercent: 2.5,
    wikiLink: 'https://wiki.com/item'
  }
]

<ItemTable
  items={items}
  theme="light" // or "dark"
  allItemPrices={allItemPrices}
  title="Required Items"
  showExternalLinks={true}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `TableItem[]` | required | Array of items to display |
| `theme` | `'light' \| 'dark'` | `'light'` | Visual theme |
| `allItemPrices` | `ItemPrice[]` | optional | Full price data for change calculation |
| `className` | `string` | `''` | Additional CSS classes |
| `title` | `string` | optional | Table title |
| `showExternalLinks` | `boolean` | `true` | Show wiki links |

### TableItem Interface

```tsx
interface TableItem {
  id: string
  image?: string
  name: string
  shortName?: string
  count: number
  unitPrice: number
  totalPrice: number
  changeLast48hPercent?: number
  changeLast48h?: number // for weapon parts 
  wikiLink?: string
  fleaPrice?: number // for weapon parts calculation
}
```

## Before vs After

### Before: 6 Duplicate Table Implementations
- QuestTable.tsx: 4 tables with similar but inconsistent code
- FleaRestrictedItemTable.tsx: 2 tables with different styling
- Total: ~800 lines of duplicated table code
- Inconsistent price change implementations
- Maintenance nightmare

### After: 1 Shared Component
- Single ItemTable component: ~200 lines
- Consistent styling and functionality
- Centralized price change logic
- Easy to maintain and extend
- Type-safe interface

## Code Reduction
- **Removed**: ~600 lines of duplicate code
- **Added**: ~200 lines of shared component
- **Net reduction**: ~400 lines (67% reduction)
- **Tables standardized**: 6 tables now using shared component 