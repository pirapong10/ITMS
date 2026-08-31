'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Ticket, Laptop, Key, FolderKanban, GitPullRequest, AlertCircle, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { useRouter } from 'next/navigation';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await apiFetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
      if (res.data?.results) {
        setResults(res.data.results);
      }
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const getEntityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'ticket':
        return <Ticket className="w-3.5 h-3.5 text-blue-600" />;
      case 'asset':
        return <Laptop className="w-3.5 h-3.5 text-emerald-600" />;
      case 'license':
        return <Key className="w-3.5 h-3.5 text-amber-600" />;
      case 'project':
        return <FolderKanban className="w-3.5 h-3.5 text-purple-600" />;
      case 'change':
        return <GitPullRequest className="w-3.5 h-3.5 text-indigo-600" />;
      case 'problem':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-600" />;
      case 'knowledge':
        return <BookOpen className="w-3.5 h-3.5 text-teal-600" />;
      default:
        return <Search className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const handleSelect = (item: any) => {
    onClose();
    if (item.type === 'ticket') router.push(`/tickets?id=${item.id}`);
    else if (item.type === 'asset') router.push(`/assets?id=${item.id}`);
    else if (item.type === 'license') router.push(`/licenses?id=${item.id}`);
    else if (item.type === 'project') router.push(`/projects?id=${item.id}`);
    else if (item.type === 'change') router.push(`/changes?id=${item.id}`);
    else if (item.type === 'problem') router.push(`/problems?id=${item.id}`);
    else if (item.type === 'knowledge') router.push(`/knowledge?id=${item.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-xl bg-surface border border-border rounded-xl shadow-lg z-10 overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border bg-slate-50/50">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            className="w-full bg-transparent text-sm text-dark placeholder-slate-400 focus:outline-none"
            placeholder="ค้นหา Ticket, Asset, License, Project, CAB, Problem หรือ Knowledge Base..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0 ml-2" />
          ) : query ? (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-dark ml-2">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-sm font-mono ml-2">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 custom-scrollbar">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((item, idx) => (
                <div
                  key={`${item.type}-${item.id}-${idx}`}
                  onClick={() => handleSelect(item)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-md bg-slate-100 group-hover:bg-white transition-all">
                      {getEntityIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-dark truncate">
                          {item.title || item.name}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-sm bg-slate-100 text-slate-500">
                          {item.type}
                        </span>
                      </div>
                      {item.snippet && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.snippet}</p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </div>
              ))}
            </div>
          ) : query.length >= 2 && !loading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              ไม่พบผลลัพธ์ที่ตรงกับคำค้นหา &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="py-6 px-4 text-center">
              <p className="text-xs text-slate-400">พิมพ์คำค้นหาอย่างน้อย 2 ตัวอักษรเพื่อค้นหาทั่วทั้งระบบ</p>
              <div className="flex justify-center gap-1.5 mt-3 flex-wrap">
                {['Ticket', 'Asset', 'License', 'Project', 'Change', 'Problem', 'KB'].map((tag) => (
                  <span
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full hover:bg-blue-50 hover:text-primary cursor-pointer transition-all"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
