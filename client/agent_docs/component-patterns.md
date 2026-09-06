# Component Patterns — [PROJECT_NAME] Frontend
# Exact patterns Claude follows for all UI components

## Own Component Library (src/components/ui/)
These are YOUR components — no external library dependency.

### Button.tsx
```tsx
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  // Colors come from the active theme's CSS variables (see features/tree/theme).
  primary:   'bg-[var(--accent)] text-[var(--accent-text)] hover:brightness-95',
  secondary: 'bg-[var(--control-hover)] text-[var(--text-primary)] hover:brightness-95',
  danger:    'bg-red-600 hover:bg-red-700 text-white',
  ghost:     'hover:bg-[var(--control-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
};

export function Button({ variant='primary', size='md', loading, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors
        ${variantClasses[variant]}
        ${size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${props.className ?? ''}`}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
}
```

### Badge.tsx
```tsx
type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'default';

const badgeClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  error:   'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info:    'bg-blue-100 text-blue-800',
  default: 'bg-gray-100 text-gray-700',
};

export function Badge({ variant = 'default', children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClasses[variant]}`}>
      {children}
    </span>
  );
}
```

### EmptyState.tsx
```tsx
export function EmptyState({ message = 'No data found', icon }: { message?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      {icon ?? <InboxIcon className="w-12 h-12 mb-3" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}
```

### Spinner.tsx
```tsx
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={`${sizes[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`} />
  );
}
```

---

## Feature List Page Pattern
```tsx
// features/[feature]/[Feature]List.tsx
export function CustomerList() {
  const [filter, setFilter] = useState<CustomerFilter>({ pageNumber: 1, pageSize: 10 });
  const [data, setData] = useState<PaginatedList<CustomerDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const { can } = usePermissions();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await customerService.getAll(filter);
      setData(result);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const debouncedSearch = useDebounce((keyword: string) => {
    setFilter(f => ({ ...f, searchKeyword: keyword, pageNumber: 1 }));
  }, 300);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
        {can('customers.create') && (
          <Button onClick={() => setFormOpen(true)}>Add Customer</Button>
        )}
      </div>

      {/* Search */}
      <SearchInput placeholder="Search customers..." onChange={debouncedSearch} />

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : !data?.data.length ? (
        <EmptyState message="No customers found" />
      ) : (
        <>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{customer.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={customer.isActive ? 'success' : 'default'}>
                      {customer.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {can('customers.edit') && (
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>Edit</Button>
                    )}
                    {can('customers.delete') && (
                      <Button variant="danger" size="sm" onClick={() => handleDelete(customer.id)}>Delete</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            currentPage={data.pageNumber}
            totalPages={data.totalPages}
            onPageChange={page => setFilter(f => ({ ...f, pageNumber: page }))}
          />
        </>
      )}

      <CustomerForm
        open={formOpen}
        customerId={selectedId}
        onClose={() => { setFormOpen(false); setSelectedId(undefined); }}
        onSaved={loadData}
      />
    </div>
  );
}
```

## Feature Form Modal Pattern
```tsx
// features/[feature]/[Feature]Form.tsx
interface CustomerFormProps {
  open: boolean;
  customerId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function CustomerForm({ open, customerId, onClose, onSaved }: CustomerFormProps) {
  const isEdit = !!customerId;
  const [form, setForm] = useState<CreateCustomerDto>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) await customerService.update(customerId!, form);
      else await customerService.create(form);
      toast.success(`Customer ${isEdit ? 'updated' : 'created'} successfully`);
      onSaved();
      onClose();
    } catch (err) {
      // map validation errors to fields
      setErrors(extractErrors(err));
      toast.error('Please fix the errors below');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">{isEdit ? 'Edit' : 'Add'} Customer</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              error={errors.name}
              required
            />
          </div>

          {/* Searchable dropdown for master data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <AsyncSelect
              loadOptions={categoryService.dropdown}
              value={form.categoryId}
              onChange={id => setForm(f => ({ ...f, categoryId: id }))}
              placeholder="Search category..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## Service Pattern
```typescript
// features/[feature]/service.ts
import api from '@/lib/api';
import type { CustomerDto, CreateCustomerDto, CustomerFilter } from './types';
import type { PaginatedList, DropdownItem } from '@/types/common';

export const customerService = {
  getAll: (filter: CustomerFilter) =>
    api.get<PaginatedList<CustomerDto>>('/customers', { params: filter }).then(r => r.data),

  getById: (id: string) =>
    api.get<CustomerDto>(`/customers/${id}`).then(r => r.data),

  dropdown: async (keyword: string): Promise<DropdownItem[]> =>
    api.get('/customers/dropdown', { params: { keyword, pageSize: 20 } }).then(r => r.data),

  create: (data: CreateCustomerDto) =>
    api.post('/customers', data).then(r => r.data),

  update: (id: string, data: UpdateCustomerDto) =>
    api.put(`/customers/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/customers/${id}`),

  restore: (id: string) =>
    api.put(`/customers/${id}/restore`),
};
```

## Naming Conventions
| What | Convention | Example |
|---|---|---|
| Feature folder | lowercase | features/customers/ |
| Component file | PascalCase | CustomerList.tsx |
| Service file | camelCase | service.ts |
| Types file | camelCase | types.ts |
| Hook | use + PascalCase | usePermissions.ts |
| UI component | PascalCase | Button.tsx |
