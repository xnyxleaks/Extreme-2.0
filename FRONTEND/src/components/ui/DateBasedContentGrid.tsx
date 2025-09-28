import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Eye, Play, Image as ImageIcon, Video, HardDrive } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from './Button';
import { contentApi } from '../../services/api';
import type { ContentGroup, Content } from '../../types';

interface DateBasedContentGridProps {
  ethnicity?: string;
  category?: string;
  onCategoryChange?: (category: string) => void;
  showCategoryFilter?: boolean;
}

const DateBasedContentGrid: React.FC<DateBasedContentGridProps> = ({
  ethnicity,
  category,
  onCategoryChange,
  showCategoryFilter = false
}) => {
  const [contentGroups, setContentGroups] = useState<ContentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreContent, setHasMoreContent] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInitialContent();
    if (showCategoryFilter) {
      loadCategories();
    }
  }, [ethnicity, category]);

  const loadInitialContent = async () => {
    try {
      setLoading(true);
      setCurrentPage(1);
      const response = await contentApi.getByDate({
        page: 1,
        ethnicity,
        category
      });
      
      setContentGroups(response.contentGroups || []);
      setHasMoreContent(response.hasMoreContent || false);
      
      // Auto-expand first day
      if (response.contentGroups && response.contentGroups.length > 0) {
        setExpandedDays(new Set([response.contentGroups[0].date]));
      }
    } catch (error) {
      console.error('Error loading content:', error);
      setContentGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await contentApi.getCategories({ ethnicity });
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadMoreContent = async () => {
    if (!hasMoreContent || loadingMore) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      
      const response = await contentApi.getByDate({
        page: nextPage,
        ethnicity,
        category
      });
      
      setContentGroups(prev => [...prev, ...(response.contentGroups || [])]);
      setHasMoreContent(response.hasMoreContent || false);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Error loading more content:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleDayExpansion = (date: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const formatViews = (views: number) => {
    return new Intl.NumberFormat('en-US', { 
      notation: 'compact',
      maximumFractionDigits: 1 
    }).format(views);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateStr = date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-8 bg-dark-200 rounded-lg w-64 mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, j) => (
                <div key={j} className="aspect-[4/5] bg-dark-200 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Category Filter */}
      {showCategoryFilter && categories.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Filter by Category
          </label>
          <select
            value={category || ''}
            onChange={(e) => onCategoryChange?.(e.target.value)}
            className="px-4 py-2 bg-dark-200 border border-dark-100 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content Groups by Date */}
      {contentGroups.map((group) => (
        <div key={group.date} className="bg-dark-200 rounded-xl border border-dark-100 overflow-hidden">
          {/* Date Header */}
          <button
            onClick={() => toggleDayExpansion(group.date)}
            className="w-full px-6 py-4 bg-gradient-to-r from-primary-500/20 to-primary-600/20 border-b border-dark-100 flex items-center justify-between hover:from-primary-500/30 hover:to-primary-600/30 transition-all duration-200"
          >
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-primary-400 mr-3" />
              <div className="text-left">
                <h3 className="text-lg font-bold text-white">
                  {formatDate(group.date)}
                </h3>
                <p className="text-sm text-gray-400">
                  {group.count} content{group.count !== 1 ? 's' : ''} posted
                </p>
              </div>
            </div>
            <ChevronDown 
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                expandedDays.has(group.date) ? 'transform rotate-180' : ''
              }`} 
            />
          </button>

          {/* Content Grid */}
          {expandedDays.has(group.date) && (
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {group.contents.map((content) => (
                  <ContentCard key={content.id} content={content} />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Load More Button */}
      {hasMoreContent && (
        <div className="text-center py-8">
          <Button
            variant="primary"
            size="lg"
            onClick={loadMoreContent}
            disabled={loadingMore}
            className="px-8"
          >
            {loadingMore ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Loading more days...
              </>
            ) : (
              'Load More Days'
            )}
          </Button>
          <p className="text-gray-400 text-sm mt-2">
            Load 30 more days of content
          </p>
        </div>
      )}

      {contentGroups.length === 0 && !loading && (
        <div className="text-center py-20">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Content Found</h3>
          <p className="text-gray-400">
            No content available for the selected filters.
          </p>
        </div>
      )}
    </div>
  );
};

interface ContentCardProps {
  content: Content;
}

const ContentCard: React.FC<ContentCardProps> = ({ content }) => {
  const formatViews = (views: number) => {
    return new Intl.NumberFormat('en-US', { 
      notation: 'compact',
      maximumFractionDigits: 1 
    }).format(views);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Link 
      to={`/content/${content.slug}`}
      className="group block overflow-hidden bg-dark-300 rounded-lg shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img 
          src={content.thumbnailUrl || content.model?.photoUrl} 
          alt={content.title} 
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-dark-300/90"></div>
        
        {/* Content Info Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {content.info?.images && content.info.images > 0 && (
            <span className="px-2 py-1 bg-blue-500/80 backdrop-blur-sm text-white text-xs font-medium rounded-full flex items-center">
              <ImageIcon size={10} className="mr-1" />
              {content.info.images}
            </span>
          )}
          {content.info?.videos && content.info.videos > 0 && (
            <span className="px-2 py-1 bg-red-500/80 backdrop-blur-sm text-white text-xs font-medium rounded-full flex items-center">
              <Video size={10} className="mr-1" />
              {content.info.videos}
            </span>
          )}
          {content.info?.size && content.info.size > 0 && (
            <span className="px-2 py-1 bg-green-500/80 backdrop-blur-sm text-white text-xs font-medium rounded-full flex items-center">
              <HardDrive size={10} className="mr-1" />
              {formatFileSize(content.info.size)}
            </span>
          )}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-sm text-white group-hover:text-primary-400 transition-colors mb-1 line-clamp-2">
            {content.title}
          </h3>
          
          {content.model && (
            <div className="mb-2">
              <p className="text-xs text-gray-300">by {content.model.name}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-gray-300">
            <div className="flex items-center">
              <Eye size={12} className="mr-1 text-primary-500" />
              <span>{formatViews(content.views)}</span>
            </div>
            
            <div className="text-xs text-gray-400">
              {new Date(content.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default DateBasedContentGrid;