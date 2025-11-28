import * as React from 'react';
import { cn } from '@/lib/utils';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';

export type SelectTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;
export interface SelectValueProps {
  placeholder?: string;
}
export type SelectContentProps = React.HTMLAttributes<HTMLDivElement>;
export type SelectItemProps = React.OptionHTMLAttributes<HTMLOptionElement>;

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => (
    <button ref={ref} className={className} {...props}>
      {children}
    </button>
  )
);
SelectTrigger.displayName = 'SelectTrigger';

const SelectValue = ({ placeholder }: SelectValueProps) => <span>{placeholder}</span>;
SelectValue.displayName = 'SelectValue';

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  )
);
SelectContent.displayName = 'SelectContent';

const SelectItem = React.forwardRef<HTMLOptionElement, SelectItemProps>(
  ({ className, children, ...props }, ref) => (
    <option ref={ref} className={className} {...props}>
      {children}
    </option>
  )
);
SelectItem.displayName = 'SelectItem';

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
