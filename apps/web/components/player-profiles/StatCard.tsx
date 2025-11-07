/**
 * StatCard Component
 * Sprint 10 Week 2 - Day 3: UI Components
 *
 * Displays a single player statistic with icon and description.
 */

import { Card, CardContent } from '@/components/ui/card';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  className?: string;
}

export function StatCard({ title, value, icon, description, className = '' }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className="ml-4">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
