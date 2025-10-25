import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('shows add button when handler provided', () => {
    render(<EmptyState hasFilters={false} onAddItem={() => {}} />);

    expect(screen.getByRole('button', { name: /add your first item/i })).toBeInTheDocument();
  });

  it('hides add button when handler is not provided', () => {
    render(<EmptyState hasFilters={false} />);

    expect(screen.queryByRole('button', { name: /add your first item/i })).not.toBeInTheDocument();
  });
});
