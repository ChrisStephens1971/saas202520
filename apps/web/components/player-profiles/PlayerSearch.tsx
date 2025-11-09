/**
 * Player Search Component
 * Sprint 10 Week 2 - Day 4: Search & Settings
 *
 * Search and filter players with real-time results.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, MapPin, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { debounce } from 'lodash';

interface PlayerResult {
  id: string;
  name: string;
  skillLevel: string;
  location?: string;
  winRate: number;
  totalTournaments: number;
  lastPlayed?: string;
  photoUrl?: string;
}

interface SearchParams {
  query: string;
  skillLevel?: string[];
  sortBy: 'name' | 'winRate' | 'tournaments' | 'lastPlayed';
  sortOrder: 'asc' | 'desc';
  limit: number;
}

interface PlayerSearchProps {
  tenantId: string;
  onPlayerSelect?: (playerId: string) => void;
  className?: string;
}

export function PlayerSearch({ tenantId, onPlayerSelect, className }: PlayerSearchProps) {
  const [query, setQuery] = useState('');
  const [skillLevel, setSkillLevel] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'winRate' | 'tournaments' | 'lastPlayed'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchParams: SearchParams) => {
      setLoading(true);
      try {
        const response = await fetch('/api/players/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenantId,
            ...searchParams,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setResults(data.players);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    [tenantId]
  );

  // Trigger search when parameters change
  useEffect(() => {
    performSearch({
      query,
      skillLevel: skillLevel.length > 0 ? skillLevel : undefined,
      sortBy,
      sortOrder,
      limit: 20,
    });
  }, [query, skillLevel, sortBy, sortOrder, performSearch]);

  const toggleSkillLevel = (level: string) => {
    setSkillLevel((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search players by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 border rounded-lg bg-secondary/50 space-y-4">
          {/* Skill Level Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Skill Level</label>
            <div className="flex flex-wrap gap-2">
              {['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].map((level) => (
                <Button
                  key={level}
                  variant={skillLevel.includes(level) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSkillLevel(level)}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'name' | 'winRate' | 'tournaments' | 'lastPlayed')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="winRate">Win Rate</SelectItem>
                  <SelectItem value="tournaments">Tournaments</SelectItem>
                  <SelectItem value="lastPlayed">Last Played</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Order</label>
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-2">
        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="mt-2">Searching...</p>
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No players found matching your search.</p>
          </div>
        )}

        {!loading &&
          results.map((player) => (
            <div
              key={player.id}
              onClick={() => onPlayerSelect?.(player.id)}
              className={cn(
                'flex items-center gap-4 p-4 rounded-lg border',
                'transition-all hover:shadow-md hover:border-primary',
                onPlayerSelect && 'cursor-pointer'
              )}
            >
              {/* Avatar */}
              <Avatar className="h-12 w-12">
                <AvatarImage src={player.photoUrl || undefined} alt={player.name} />
                <AvatarFallback>{player.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>

              {/* Player Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{player.name}</h3>
                  <Badge variant="outline">{player.skillLevel}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {player.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {player.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {player.winRate.toFixed(1)}% win rate
                  </span>
                  <span>{player.totalTournaments} tournaments</span>
                </div>
              </div>

              {/* Last Played */}
              {player.lastPlayed && (
                <div className="text-right text-sm text-muted-foreground">
                  <div>Last played</div>
                  <div className="font-medium">{new Date(player.lastPlayed).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Results Count */}
      {!loading && results.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {results.length} player{results.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
