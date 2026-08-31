'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../src/components/layout/AppShell';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { Input } from '../../src/components/ui/Input';
import { Select } from '../../src/components/ui/Select';
import { Modal } from '../../src/components/ui/Modal';
import {
  BookOpen,
  Plus,
  Search,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Globe,
  Lock,
  RefreshCw,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { apiFetch } from '../../src/lib/api-client';

export default function KnowledgePage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Selected Article Viewer
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // New Article Modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('Public');
  const [tags, setTags] = useState('vpn, network, guide');

  const fetchArticles = async () => {
    setLoading(true);
    let url = `/api/v1/kb?search=${encodeURIComponent(search)}`;
    if (selectedCategory !== 'All') {
      url += `&category=${encodeURIComponent(selectedCategory)}`;
    }

    const res = await apiFetch(url);
    if (res.data) setArticles(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory]);

  const handleSelectArticle = async (articleId: string) => {
    setDetailLoading(true);
    setFeedbackSent(false);
    const res = await apiFetch(`/api/v1/kb/${articleId}`);
    if (res.data) setSelectedArticle(res.data);
    setDetailLoading(false);
  };

  const handleSendFeedback = async (isHelpful: boolean) => {
    if (!selectedArticle) return;
    await apiFetch(`/api/v1/kb/${selectedArticle.id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ is_helpful: isHelpful }),
    });

    setFeedbackSent(true);
    handleSelectArticle(selectedArticle.id);
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);

    const res = await apiFetch('/api/v1/kb', {
      method: 'POST',
      body: JSON.stringify({
        title,
        category,
        content,
        visibility,
        tags: tagList,
      }),
    });

    setCreateLoading(false);

    if (res.data) {
      setNewModalOpen(false);
      setTitle('');
      setContent('');
      fetchArticles();
    }
  };

  const categories = ['All', 'Hardware', 'Software', 'Network', 'Access', 'Policy', 'General'];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-dark tracking-tight">Self-Service Knowledge Base (KCS)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ศูนย์รวมคู่มือวิธีแก้ปัญหา (KCS) และบทความช่วยเหลือสำหรับผู้ใช้งานและทีมช่าง
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchArticles} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรช</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setNewModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              <span>สร้างบทความใหม่</span>
            </Button>
          </div>
        </div>

        {/* Search & Category Pills */}
        <div className="space-y-3">
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-border rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="ค้นหาคู่มือการใช้งาน, วิธีแก้ปัญหา Wi-Fi, การตั้งค่าอีเมล..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchArticles()}
                />
              </div>
              <Button variant="primary" size="sm" onClick={fetchArticles}>
                ค้นหาบทความ
              </Button>
            </div>
          </Card>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white text-slate-600 border-border hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.length > 0 ? (
            articles.map((art) => (
              <Card
                key={art.id}
                hover
                onClick={() => handleSelectArticle(art.id)}
                className="cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="blue" size="sm">
                      {art.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      {art.visibility === 'Public' ? (
                        <Globe className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Lock className="w-3 h-3 text-slate-400" />
                      )}
                      <span>{art.visibility}</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-dark line-clamp-2">{art.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {art.content.replace(/[#*`_]/g, '')}
                  </p>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {art.view_count || 1}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <ThumbsUp className="w-3 h-3" /> {art.helpful_count || 0}
                    </span>
                  </div>
                  <span className="text-primary font-semibold flex items-center gap-0.5">
                    อ่านต่อ <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Card>
            ))
          ) : (
            <Card className="col-span-full py-12 text-center text-xs text-slate-400">
              ไม่พบบทความความรู้ในหมวดหมู่นี้
            </Card>
          )}
        </div>

        {/* Article Reader Modal */}
        {selectedArticle && (
          <Modal
            isOpen={!!selectedArticle}
            onClose={() => setSelectedArticle(null)}
            title={selectedArticle.title}
            description={`หมวดหมู่: ${selectedArticle.category} | ความเป็นส่วนตัว: ${selectedArticle.visibility}`}
            maxWidth="2xl"
          >
            <div className="space-y-5">
              {/* Article Content */}
              <div className="prose prose-xs max-w-none text-xs text-slate-700 bg-slate-50 p-4 rounded-lg border border-border whitespace-pre-wrap leading-relaxed">
                {selectedArticle.content}
              </div>

              {/* Tags */}
              {selectedArticle.tags && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  {selectedArticle.tags.map((t: string) => (
                    <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Feedback Widget */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-dark">บทความนี้ช่วยแก้ปัญหาของคุณได้หรือไม่?</p>
                  <p className="text-[11px] text-slate-500">
                    มีผู้กดว่ามีประโยชน์ {selectedArticle.helpful_count || 0} คน / ไม่มีประโยชน์{' '}
                    {selectedArticle.not_helpful_count || 0} คน
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {feedbackSent ? (
                    <span className="text-xs font-semibold text-emerald-600">ขอบคุณสำหรับความคิดเห็น!</span>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => handleSendFeedback(true)}>
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>มีประโยชน์</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleSendFeedback(false)}>
                        <ThumbsDown className="w-3.5 h-3.5 text-rose-600" />
                        <span>ไม่ช่วย</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Create Article Modal */}
        <Modal
          isOpen={newModalOpen}
          onClose={() => setNewModalOpen(false)}
          title="สร้างบทความความรู้ใหม่ (New Knowledge Article)"
          description="เขียนขั้นตอนวิธีแก้ไขปัญหา หรือคู่มือการใช้งานสำหรับผู้ใช้และทีมงาน"
          maxWidth="xl"
        >
          <form onSubmit={handleCreateArticle} className="space-y-4">
            <Input
              label="ชื่อบทความ (Article Title)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น วิธีตั้งค่าเชื่อมต่อ VPN บน Windows 11"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="หมวดหมู่"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: 'Hardware', label: 'Hardware' },
                  { value: 'Software', label: 'Software' },
                  { value: 'Network', label: 'Network' },
                  { value: 'Access', label: 'Access & Permissions' },
                  { value: 'Policy', label: 'IT Policy' },
                  { value: 'General', label: 'General' },
                ]}
              />

              <Select
                label="ระดับการมองเห็น"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                options={[
                  { value: 'Public', label: 'Public (ผู้ใช้ทุกคนเข้าถึงได้)' },
                  { value: 'Internal', label: 'Internal (เฉพาะทีม IT)' },
                ]}
              />
            </div>

            <Input
              label="แท็กคำค้นหา (Tags - คั่นด้วยจุลภาค)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="vpn, windows, guide, security"
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">เนื้อหาบทความ (Markdown)</label>
              <textarea
                rows={6}
                className="w-full text-xs p-3 bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                placeholder="พิมพ์ขั้นตอนและคำแนะนำ เช่น:&#10;1. ดาวน์โหลดโปรแกรม...&#10;2. กรอก Server IP..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setNewModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={createLoading}>
                เผยแพร่บทความ
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
