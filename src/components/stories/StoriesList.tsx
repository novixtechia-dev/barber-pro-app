'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Story, Barber } from '@/types';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { EyeIcon } from '@heroicons/react/24/outline';

interface StoryGroup {
  barber: Barber;
  stories: Story[];
  viewed: boolean;
}

// ─── Story Ring (thumbnail na lista) ─────────────────────────
function StoryRing({ group, onClick }: { group: StoryGroup; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 flex-shrink-0">
      <div className={`p-0.5 rounded-full ${
        group.viewed
          ? 'bg-gray-600'
          : 'bg-gradient-to-tr from-electric via-glow to-primary'
      }`}>
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-black">
          <img
            src={group.barber.profile?.avatar_url || '/default-avatar.png'}
            alt={group.barber.display_name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <span className="text-xs text-gray-300 max-w-[60px] truncate text-center">
        {group.barber.display_name.split(' ')[0]}
      </span>
    </button>
  );
}

// ─── Story Viewer ─────────────────────────────────────────────
function StoryViewer({
  groups, initialGroupIndex, onClose
}: {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
}) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const DURATION = 5000;

  const markViewed = async (storyId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('story_views').upsert({
      story_id: storyId,
      viewer_id: session.user.id,
    });
    await supabase.from('stories').update({ views_count: story.views_count + 1 }).eq('id', storyId);
  };

  useEffect(() => {
    const originalUrl = window.location.pathname;
    return () => {
      window.history.pushState(null, '', originalUrl);
    };
  }, []);

  useEffect(() => {
    if (group) {
      const barberName = group.barber.display_name.replace(/\s+/g, '-').toLowerCase();
      window.history.pushState(null, '', `/story/${barberName}`);
    }
  }, [groupIndex]);

  useEffect(() => {
    if (!story) return;
    markViewed(story.id);
    setProgress(0);

    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) goNext();
    }, 50);

    return () => clearInterval(intervalRef.current);
  }, [storyIndex, groupIndex]);

  const goNext = () => {
    clearInterval(intervalRef.current);
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex(s => s + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(g => g + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    clearInterval(intervalRef.current);
    if (storyIndex > 0) {
      setStoryIndex(s => s - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(g => g - 1);
      setStoryIndex(groups[groupIndex - 1].stories.length - 1);
    }
  };

  if (!story) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-dark/95 backdrop-blur-md flex items-center justify-center"
    >
      <div className="relative w-full h-full sm:w-auto sm:aspect-[9/16] sm:h-[85vh] sm:max-h-[800px] sm:rounded-[2rem] overflow-hidden bg-dark shadow-2xl sm:border sm:border-white/10 mx-auto">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2 pt-safe-top sm:pt-4">
        {group.stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 z-20 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img
              src={group.barber.profile?.avatar_url || '/default-avatar.png'}
              alt={group.barber.display_name}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-white font-semibold text-sm">{group.barber.display_name}</span>
          <span className="text-white/50 text-xs">
            {new Date(story.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <button onClick={onClose}>
          <XMarkIcon className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Media */}
      <div className="absolute inset-0">
        {story.media_type === 'image' ? (
          <img src={story.media_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <video src={story.media_url} className="w-full h-full object-cover" autoPlay muted loop />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      {/* Caption */}
      {story.caption && (
        <div className="absolute bottom-20 left-4 right-4 z-20">
          <p className="text-white text-sm bg-dark/40 rounded-lg p-3 backdrop-blur-sm">
            {story.caption}
          </p>
        </div>
      )}

      {/* Views count */}
      <div className="absolute bottom-8 left-4 z-20 flex items-center gap-1 text-white/60 text-xs">
        <EyeIcon className="w-4 h-4" />
        <span>{story.views_count}</span>
      </div>

      {/* Touch areas */}
      <button className="absolute left-0 top-0 bottom-0 w-1/3 z-10" onClick={goPrev} />
      <button className="absolute right-0 top-0 bottom-0 w-2/3 z-10" onClick={goNext} />
      </div>
    </motion.div>
  );
}

// ─── Stories List (exportado) ─────────────────────────────────
export default function StoriesList() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    const { data } = await supabase
      .from('stories')
      .select(`
        *,
        barber:barbers(
          id, display_name,
          profile:profiles(avatar_url)
        )
      `)
      .gt('expires_at', new Date().toISOString())
      .lte('created_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (!data) return;

    // Agrupar por barbeiro
    const grouped = data.reduce((acc, story) => {
      const barberId = story.barber_id;
      if (!acc[barberId]) {
        acc[barberId] = { barber: story.barber, stories: [], viewed: false };
      }
      acc[barberId].stories.push(story);
      return acc;
    }, {} as Record<string, StoryGroup>);

    setGroups(Object.values(grouped));
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto px-4 py-3 no-scrollbar">
        {groups.map((group, i) => (
          <StoryRing key={group.barber.id} group={group} onClick={() => setActiveGroupIndex(i)} />
        ))}
      </div>

      <AnimatePresence>
        {activeGroupIndex !== null && (
          <StoryViewer
            groups={groups}
            initialGroupIndex={activeGroupIndex}
            onClose={() => setActiveGroupIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
