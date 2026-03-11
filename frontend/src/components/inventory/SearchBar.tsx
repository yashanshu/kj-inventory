import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search items...' }: SearchBarProps) {
  return (
    <div className="input-icon-wrap" style={{ flex: 1 }}>
      <Search className="input-icon" style={{ width: 15, height: 15 }} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input"
        style={{ paddingRight: value ? '2.25rem' : undefined }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--neutral-400)', padding: 2, display: 'flex',
          }}
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      )}
    </div>
  );
}
