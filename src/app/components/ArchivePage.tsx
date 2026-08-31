import { useState } from 'react';
import { Search, Lock, FileText, ChevronRight, Clock, CheckCircle } from 'lucide-react';
import { Decision, CATEGORY_LABELS } from './types';

interface Props {
  decisions: Decision[];
  onOpen: (id: string) => void;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function daysSince(ts: number) {
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}

function normalizeWeights(dims: { id: string; weight: number }[]) {
  const total = dims.reduce((s, d) => s + d.weight, 0);
  if (total === 0) return Object.fromEntries(dims.map((d) => [d.id, 1 / dims.length]));
  return Object.fromEntries(dims.map((d) => [d.id, d.weight / total]));
}

function calcTopOption(decision: Decision) {
  if (!decision.dimensions.length || !decision.options.length) return null;
  const nw = normalizeWeights(decision.dimensions);
  return [...decision.options]
    .map((opt) => ({
      opt,
      score: decision.dimensions.reduce((s, d) => s + (opt.scores[d.id] ?? 5) * (nw[d.id] ?? 0), 0),
    }))
    .sort((a, b) => b.score - a.score)[0];
}

export function ArchivePage({ decisions, onOpen }: Props) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = decisions.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.options.some((o) => o.name.toLowerCase().includes(search.toLowerCase()));
    const matchCat = filterCat === 'all' || d.category === filterCat;
    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'locked' && d.status === 'locked') ||
      (filterStatus === 'draft' && d.status === 'draft') ||
      (filterStatus === 'pending_review' && d.status === 'locked' && !d.reviewedAt &&
        d.lockedAt && Date.now() - d.lockedAt > 7 * 24 * 3600 * 1000);
    return matchSearch && matchCat && matchStatus;
  });

  const cats = Object.entries(CATEGORY_LABELS) as [Decision['category'], string][];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-5 pt-10 pb-4 shrink-0">
        <h1 className="text-card-foreground mb-1">决策档案</h1>
        <p className="text-sm text-muted-foreground">回顾你的每一次决策</p>
      </div>

      {/* Search */}
      <div className="px-5 mb-3 shrink-0">
        <div className="flex items-center gap-2 bg-input-background border border-border rounded-xl px-3 py-2.5">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            aria-label="搜索决策标题或选项"
            className="flex-1 bg-transparent text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="搜索决策标题或选项..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-5 mb-3 shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterCat('all')}
            aria-pressed={filterCat === 'all'}
            className={`px-3 py-1.5 rounded-full text-xs border whitespace-nowrap transition-all ${
              filterCat === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'
            }`}
          >
            全部
          </button>
          {cats.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterCat(filterCat === key ? 'all' : key)}
              aria-pressed={filterCat === key}
              className={`px-3 py-1.5 rounded-full text-xs border whitespace-nowrap transition-all ${
                filterCat === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setFilterStatus(filterStatus === 'pending_review' ? 'all' : 'pending_review')}
            aria-pressed={filterStatus === 'pending_review'}
            className={`px-3 py-1.5 rounded-full text-xs border whitespace-nowrap transition-all ${
              filterStatus === 'pending_review' ? 'bg-amber-500 text-white border-amber-500' : 'bg-card border-border text-muted-foreground'
            }`}
          >
            待回访
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileText size={24} className="text-muted-foreground" />
            </div>
            <p className="text-card-foreground mb-1">
              {search || filterCat !== 'all' || filterStatus !== 'all' ? '没有匹配的档案' : '还没有档案'}
            </p>
            <p className="text-sm text-muted-foreground">
              {!search && filterCat === 'all' && filterStatus === 'all' && '完成一次决策后，档案会出现在这里'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((d) => {
              const top = calcTopOption(d);
              const needsReview = d.status === 'locked' && !d.reviewedAt &&
                d.lockedAt && Date.now() - d.lockedAt > 7 * 24 * 3600 * 1000;

              return (
                <button
                  key={d.id}
                  onClick={() => onOpen(d.id)}
                  className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        {d.status === 'locked' ? (
                          <Lock size={11} className="text-primary shrink-0" />
                        ) : (
                          <Clock size={11} className="text-muted-foreground shrink-0" />
                        )}
                        {needsReview && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">
                            待回访
                          </span>
                        )}
                        {d.reviewedAt && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
                            <CheckCircle size={9} />
                            已回访
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-card-foreground truncate">{d.title || '未命名决策'}</p>
                    </div>
                    <ChevronRight size={15} className="text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0 ml-2" />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    <span>{formatDate(d.createdAt)}</span>
                    {d.lockedAt && <span>锁定于 {daysSince(d.lockedAt)} 天前</span>}
                    <span className="px-1.5 py-0.5 bg-secondary rounded-full">{CATEGORY_LABELS[d.category]}</span>
                  </div>

                  {/* Options preview */}
                  <div className="flex flex-wrap gap-1.5">
                    {d.options.slice(0, 4).map((o, i) => (
                      <span
                        key={o.id}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          top?.opt.id === o.id && d.status === 'locked'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {o.name}
                      </span>
                    ))}
                    {d.options.length > 4 && (
                      <span className="text-xs text-muted-foreground">+{d.options.length - 4}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
