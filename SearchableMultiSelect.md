# SearchableMultiSelect Component

A reusable, mobile-friendly multi-select component with search functionality.

## Features

- ✅ **Mobile-Friendly**: Touch-optimized with no keyboard shortcuts needed
- ✅ **Searchable**: Real-time filtering by label or sublabel
- ✅ **Scrollable**: Configurable max-height with smooth scrolling
- ✅ **Select/Clear All**: Bulk selection controls
- ✅ **Visual Feedback**: Shows selected count, hover states, validation messages
- ✅ **Accessible**: Proper labeling, keyboard navigation support
- ✅ **Flexible**: Customizable placeholder, empty messages, and max height

## Usage

```tsx
import SearchableMultiSelect from '@/components/SearchableMultiSelect';

// In your component
const [selectedIds, setSelectedIds] = useState<string[]>([]);

<SearchableMultiSelect
  options={items.map((item) => ({
    value: item._id,
    label: item.primaryText,
    sublabel: item.secondaryText, // optional
  }))}
  selectedValues={selectedIds}
  onChange={setSelectedIds}
  label="Items"
  placeholder="Search items..."
  disabled={false}
  required={true}
  emptyMessage="No items available"
  maxHeight="max-h-60" // optional, defaults to max-h-60
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `options` | `Option[]` | Yes | - | Array of options to display |
| `selectedValues` | `string[]` | Yes | - | Array of currently selected values |
| `onChange` | `(values: string[]) => void` | Yes | - | Callback when selection changes |
| `label` | `string` | Yes | - | Label text for the component |
| `placeholder` | `string` | No | `'Search...'` | Placeholder for search input |
| `disabled` | `boolean` | No | `false` | Disable the component |
| `required` | `boolean` | No | `false` | Show required indicator |
| `emptyMessage` | `string` | No | `'No options available'` | Message when no options |
| `maxHeight` | `string` | No | `'max-h-60'` | Tailwind class for max height |

## Option Interface

```typescript
interface Option {
  value: string;      // Unique identifier
  label: string;      // Primary display text (shown in bold)
  sublabel?: string;  // Optional secondary text (shown in gray)
}
```

## Examples

### Basic Usage (Jobs)
```tsx
<SearchableMultiSelect
  options={jobs.map((job) => ({
    value: job._id,
    label: job.jobNo,
    sublabel: job.jobName,
  }))}
  selectedValues={selectedJobIds}
  onChange={setSelectedJobIds}
  label="Job Numbers"
  placeholder="Search jobs by number or name..."
  required={true}
/>
```

### With Custom Height
```tsx
<SearchableMultiSelect
  options={options}
  selectedValues={selected}
  onChange={setSelected}
  label="Select Items"
  maxHeight="max-h-96" // Taller container
/>
```

### Disabled State
```tsx
<SearchableMultiSelect
  options={options}
  selectedValues={selected}
  onChange={setSelected}
  label="Items"
  disabled={!parentSelected}
  emptyMessage="Please select parent first"
/>
```

## Current Implementations

- **Estimates (Create)**: `app/dashboard/estimates/create/page.tsx`
- **Estimates (Edit)**: `app/dashboard/estimates/[id]/page.tsx`

## Future Use Cases

This component can be used wherever multi-select is needed:
- Selecting multiple clients
- Selecting multiple equipment items
- Selecting multiple papers
- Any multi-selection scenario with large datasets
