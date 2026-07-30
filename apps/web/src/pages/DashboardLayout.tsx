/**
 * PHASE 1 AUDIT — DashboardLayout.tsx
 * - Removed unused lucide-react imports (Home, Library, GalleryVerticalEnd, Film, FileVideo, Key, CreditCard).
 * - Replaced hardcoded hex/rgba in charts and motion styles with CSS variables.
 * - Replaced raw Tailwind palette utilities (black/white/gray/emerald/red/blue/amber/indigo/yellow) with voice-* tokens.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../dashboard.css';
import { 
  Mic, 
  Activity, 
  Users, 
  Settings, 
  BarChart3, 
  Play, 
  Pause, 
  Phone, 
  Globe, 
  Zap,
  LayoutDashboard,
  Code,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  ChevronDown,
  ChevronUp,
  Clock,
  Volume2,
  RefreshCw,
  GripVertical,
  Calendar,
  Filter,
  ArrowUpDown,
  MessageSquarePlus,
  UserPlus,
  LogOut,
  Upload,
  Loader2,
  X,
  Search
} from 'lucide-react';
import { Reorder, motion, AnimatePresence } from "motion/react";
import UserMenu from '../components/dashboard/UserMenu';
import gsap from 'gsap';
import { cn } from '../lib/utils';
import { Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardTopbar from '@/components/dashboard/DashboardTopbar';
import StatCard from '@/components/dashboard/StatCard';
import OverviewDashboard from '@/components/dashboard/OverviewDashboard';
import AnalyticsDashboard from '@/components/dashboard/AnalyticsDashboard';
import SettingsWorkspace from '@/components/dashboard/SettingsWorkspace';
import AgentModal from '@/components/dashboard/AgentModal';
import IntegrationsWorkspace from '@/components/dashboard/IntegrationsWorkspace';
import KnowledgeWorkspace from '@/components/dashboard/KnowledgeWorkspace';
import ToolsWorkspace from '@/components/dashboard/ToolsWorkspace';
import VoicesWorkspace from '@/components/dashboard/VoicesWorkspace';
import WorkflowsWorkspace from '@/components/dashboard/WorkflowsWorkspace';
import ConversationsWorkspace from '@/components/dashboard/ConversationsWorkspace';
import GuardrailsWorkspace from '@/components/dashboard/GuardrailsWorkspace';
import { buildDashboardCrumbs } from '../lib/dashboard/crumbs';
import {
  PhoneCall,
  Timer,
  TrendingUp,
  Headphones,
  Server,
  Cpu,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  Webhook as WebhookIcon,
  CalendarDays,
  MessageSquare,
  Hourglass,
  TrendingDown,
} from 'lucide-react';
import { useVoiceAgentFromRecord } from '../lib/voice-agent/useVoiceAgentFromRecord';
import { useAgentStore, type AppAgent } from '../lib/agents/AgentStoreContext';
import { apiJson, getActiveOrgId } from '../lib/auth/client';
import {
  resolveLanguageMode,
  type StoredVoiceAgent,
  type VoiceAgentRecord,
} from '@voiceify/shared';
import { LATENCY_TARGET_MS } from '../lib/voice-agent/constants';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';

// Types
interface Task {
  id: string;
  title: string;
  status: 'To Do' | 'In Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  dueDate?: string;
  createdAt: string;
}

interface Agent extends StoredVoiceAgent {
  tasks?: Task[];
  serverId?: string;
}

function asDashboardAgents(agents: StoredVoiceAgent[]): Agent[] {
  return agents as Agent[];
}

// Components
const LegacySidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname.split('/dashboard')[1] || '';
  const [isHovered, setIsHovered] = useState(false);
  
  const isActive = (path: string) => {
    if (path === '' && (currentPath === '' || currentPath === '/')) return true;
    if (path !== '' && currentPath.startsWith(`/${path}`)) return true;
    return false;
  };

  const navItems = [
    { id: '', icon: LayoutDashboard, label: 'Dashboard', path: '' },
    { id: 'create-conversation', icon: MessageSquarePlus, label: 'Create Conversation', path: 'sandbox' },
    { id: 'my-avatars', icon: Users, label: 'My Avatars', path: 'agents' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics', path: 'analytics' },
  ];

  return (
    <div 
      className={cn(
        "h-screen bg-voice-surface border-r border-voice-border flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out shadow-xl",
        isHovered ? "w-64" : "w-20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 gap-3 border-b border-voice-border/50">
        {/* Voiceify waveform mark */}
        <svg
          width="32" height="32" viewBox="0 0 32 32"
          fill="none" stroke="#ffffff" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          aria-label="Voiceify" style={{ flexShrink: 0 }}
        >
          <line x1="4"  y1="16" x2="4"  y2="16" />
          <line x1="9"  y1="10" x2="9"  y2="22" />
          <line x1="14" y1="5"  x2="14" y2="27" />
          <line x1="19" y1="11" x2="19" y2="21" />
          <line x1="24" y1="7"  x2="24" y2="25" />
          <line x1="28" y1="13" x2="28" y2="19" />
        </svg>
        <h1 className={cn(
          "text-xl font-bold tracking-tight text-voice-text whitespace-nowrap transition-all duration-300 overflow-hidden",
          isHovered ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"
        )}>
          Voiceify
        </h1>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={`/dashboard/${item.path}`}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
              isActive(item.path)
                ? "bg-voice-text text-voice-bg shadow-md" 
                : "text-voice-muted hover:bg-voice-border/50 hover:text-voice-text"
            )}
          >
            <item.icon className={cn(
              "w-6 h-6 shrink-0 transition-colors",
              isActive(item.path) ? "text-voice-bg" : "text-voice-muted group-hover:text-voice-text"
            )} />
            
            <span className={cn(
              "font-medium whitespace-nowrap transition-all duration-300 overflow-hidden",
              isHovered ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"
            )}>
              {item.label}
            </span>

            {/* Tooltip for collapsed state */}
            {!isHovered && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-voice-text text-voice-bg text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                {item.label}
                <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-voice-text rotate-45"></div>
              </div>
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-voice-border/50">
        <Link
          to="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
            isActive('settings')
              ? "bg-voice-text text-voice-bg shadow-md" 
              : "text-voice-muted hover:bg-voice-border/50 hover:text-voice-text"
          )}
        >
          <Settings className={cn(
            "w-6 h-6 shrink-0 transition-colors",
            isActive('settings') ? "text-voice-bg" : "text-voice-muted group-hover:text-voice-text"
          )} />
          <span className={cn(
            "font-medium whitespace-nowrap transition-all duration-300 overflow-hidden",
            isHovered ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"
          )}>
            Settings
          </span>
          
          {!isHovered && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-voice-text text-voice-bg text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
              Settings
              <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-voice-text rotate-45"></div>
            </div>
          )}
        </Link>
      </div>
    </div>
  );
};

const AgentTasksModal = ({ 
  isOpen, 
  onClose, 
  agent, 
  onUpdateTasks 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  agent: Agent | null; 
  onUpdateTasks: (agentId: number, tasks: Task[]) => void; 
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<'All' | Task['status']>('All');
  const [filterPriority, setFilterPriority] = useState<'All' | Task['priority']>('All');
  const [filterDateType, setFilterDateType] = useState<'createdAt' | 'dueDate'>('createdAt');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'Manual' | 'Title' | 'Date' | 'Priority'>('Manual');

  if (!isOpen || !agent) return null;

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      status: 'To Do',
      priority: newTaskPriority,
      dueDate: newTaskDueDate || undefined,
      createdAt: new Date().toISOString()
    };
    
    onUpdateTasks(agent.id, [...(agent.tasks ?? []), newTask]);
    setNewTaskTitle('');
    setNewTaskPriority('Medium');
    setNewTaskDueDate('');
  };

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    const updatedTasks = (agent.tasks ?? []).map(t =>
      t.id === taskId ? { ...t, status: newStatus } : t
    );
    onUpdateTasks(agent.id, updatedTasks);
  };

  const handlePriorityChange = (taskId: string, newPriority: Task['priority']) => {
    const updatedTasks = (agent.tasks ?? []).map(t =>
      t.id === taskId ? { ...t, priority: newPriority } : t
    );
    onUpdateTasks(agent.id, updatedTasks);
  };

  const handleDeleteClick = (taskId: string) => {
    setDeleteConfirmationId(taskId);
  };

  const confirmDelete = (taskId: string) => {
    const updatedTasks = (agent.tasks ?? []).filter(t => t.id !== taskId);
    onUpdateTasks(agent.id, updatedTasks);
    setDeleteConfirmationId(null);
  };

  const cancelDelete = () => {
    setDeleteConfirmationId(null);
  };

  const handleStartEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  };

  const handleSaveEditing = () => {
    if (editingTaskId && editingTaskTitle.trim()) {
      const updatedTasks = (agent.tasks ?? []).map(t =>
        t.id === editingTaskId ? { ...t, title: editingTaskTitle.trim() } : t
      );
      onUpdateTasks(agent.id, updatedTasks);
    }
    setEditingTaskId(null);
    setEditingTaskTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEditing();
    } else if (e.key === 'Escape') {
      setEditingTaskId(null);
      setEditingTaskTitle('');
    }
  };

  const handleReorder = (newOrder: Task[]) => {
    if (sortBy !== 'Manual') {
      setSortBy('Manual');
    }
    onUpdateTasks(agent.id, newOrder);
  };

  const getStatusColor = (status: Task['status']) => {
    switch(status) {
      case 'To Do': return 'bg-voice-frost-strong text-voice-text border-voice-frost-border';
      case 'In Progress': return 'bg-voice-info-faint text-voice-blue-bright border-voice-info-border';
      case 'Completed': return 'bg-voice-success-faint text-voice-success-bright border-voice-success-border';
      default: return 'bg-voice-frost-strong';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch(priority) {
      case 'High': return 'bg-voice-danger-faint text-voice-danger border-voice-danger-border';
      case 'Medium': return 'bg-voice-warning-faint text-voice-warning border-voice-warning-border';
      case 'Low': return 'bg-voice-info-faint text-voice-blue-bright border-voice-info-border';
      default: return 'bg-voice-frost-strong text-voice-muted border-voice-frost-border';
    }
  };

  const isOverdue = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const filteredTasks = (agent.tasks ?? [])
    .filter(task => {
      const matchesStatus = filterStatus === 'All' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'All' || task.priority === filterPriority;
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      const dateToFilter = filterDateType === 'createdAt' ? task.createdAt : task.dueDate;
      let matchesDate = true;
      if (dateToFilter) {
        const date = new Date(dateToFilter);
        if (filterStartDate) {
          matchesDate = matchesDate && date >= new Date(filterStartDate);
        }
        if (filterEndDate) {
          matchesDate = matchesDate && date <= new Date(filterEndDate);
        }
      } else if (filterStartDate || filterEndDate) {
        matchesDate = false;
      }

      return matchesStatus && matchesPriority && matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      if (sortBy === 'Title') return a.title.localeCompare(b.title);
      if (sortBy === 'Date') {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return dateA - dateB;
      }
      if (sortBy === 'Priority') {
        const priorityMap = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return priorityMap[a.priority] - priorityMap[b.priority];
      }
      return 0; // Manual order
    });

  const isFiltered = filterStatus !== 'All' || filterPriority !== 'All' || searchTerm !== '' || filterStartDate !== '' || filterEndDate !== '' || sortBy !== 'Manual' || filterDateType !== 'createdAt';
  const canDrag = !isFiltered;

  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 bg-voice-backdrop backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-voice-surface border border-voice-border rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-voice-border flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-voice-text">Manage Tasks</h2>
              <p className="text-sm text-voice-muted">Assign tasks for {agent.name}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-voice-frost text-voice-muted hover:text-voice-text transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-voice-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-voice-bg border border-voice-border rounded-xl pl-10 pr-4 py-2 text-sm text-voice-text focus:outline-none focus:border-voice-accent transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-voice-muted hover:text-voice-text"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Add Task Form */}
          <form onSubmit={handleAddTask} className="flex flex-col gap-4 bg-voice-bg p-5 rounded-2xl border border-voice-border shadow-inner">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full bg-voice-surface border border-voice-border rounded-xl pl-4 pr-4 py-2.5 text-voice-text focus:outline-none focus:border-voice-accent focus:ring-2 focus:ring-voice-accent/10 text-sm transition-all"
                />
              </div>
              <button 
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="bg-voice-accent hover:bg-voice-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-voice-on-accent px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-voice-accent/20 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Task</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-voice-muted uppercase tracking-wider">Priority:</span>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
                  className="bg-voice-surface border border-voice-border rounded-lg px-3 py-1.5 text-xs text-voice-text focus:outline-none focus:border-voice-accent"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-voice-muted uppercase tracking-wider">Due Date:</span>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="bg-voice-surface border border-voice-border rounded-lg px-3 py-1.5 text-xs text-voice-text focus:outline-none focus:border-voice-accent"
                />
              </div>
            </div>
          </form>

          {/* Filters & Sort */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-voice-bg rounded-xl p-1 border border-voice-border">
                {(['All', 'To Do', 'In Progress', 'Completed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      filterStatus === status 
                        ? "bg-voice-surface text-voice-text shadow-sm border border-voice-border" 
                        : "text-voice-muted hover:text-voice-text hover:bg-voice-frost"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="h-6 w-px bg-voice-border hidden sm:block" />

              <div className="flex items-center gap-2">
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as any)}
                  className="bg-voice-bg border border-voice-border rounded-xl px-3 py-1.5 text-xs text-voice-text focus:outline-none focus:border-voice-accent transition-colors"
                >
                  <option value="All">All Priorities</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-voice-bg border border-voice-border rounded-xl px-3 py-1.5 text-xs text-voice-text focus:outline-none focus:border-voice-accent transition-colors"
                >
                  <option value="Manual">Manual Order</option>
                  <option value="Title">Sort by Title</option>
                  <option value="Date">Sort by Date</option>
                  <option value="Priority">Sort by Priority</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-voice-bg/50 px-3 py-1.5 rounded-xl border border-voice-border">
                <Calendar className="w-3.5 h-3.5 text-voice-muted" />
                <select
                  value={filterDateType}
                  onChange={(e) => setFilterDateType(e.target.value as any)}
                  className="bg-transparent text-[11px] text-voice-text focus:outline-none border-none p-0 mr-1 cursor-pointer font-medium"
                >
                  <option value="createdAt">Created At</option>
                  <option value="dueDate">Due Date</option>
                </select>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="bg-transparent text-[11px] text-voice-text focus:outline-none"
                  />
                  <span className="text-voice-muted text-[11px]">to</span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="bg-transparent text-[11px] text-voice-text focus:outline-none"
                  />
                </div>
              </div>

              {(filterStatus !== 'All' || filterPriority !== 'All' || filterStartDate || filterEndDate || searchTerm || filterDateType !== 'createdAt') && (
                <button
                  onClick={() => {
                    setFilterStatus('All');
                    setFilterPriority('All');
                    setFilterDateType('createdAt');
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setSearchTerm('');
                  }}
                  className="text-xs text-voice-accent hover:text-voice-accent-hover font-medium flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Clear all filters
                </button>
              )}
            </div>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-6 pt-0 min-h-[300px]">
            {canDrag && filteredTasks.length > 1 && (
              <div className="flex items-center gap-2 text-[10px] text-voice-accent font-medium uppercase tracking-widest mb-4 bg-voice-accent/5 py-1.5 px-3 rounded-lg border border-voice-accent/10">
                <ArrowUpDown className="w-3 h-3" />
                Drag tasks to reorder
              </div>
            )}
            
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-voice-muted text-sm flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-voice-frost flex items-center justify-center">
                  <Search className="w-6 h-6 opacity-20" />
                </div>
                <p>No tasks found matching your filters.</p>
              </div>
            ) : (
              <Reorder.Group axis="y" values={filteredTasks} onReorder={handleReorder} className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredTasks.map(task => (
                    <Reorder.Item 
                      key={task.id} 
                      value={task} 
                      dragListener={canDrag}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileDrag={{ scale: 1.02, boxShadow: 'var(--color-voice-shadow-drag)' }}
                      className="relative"
                    >
                      <div className={cn(
                        "bg-voice-bg border border-voice-border rounded-xl p-4 flex items-center justify-between group select-none hover:border-voice-accent/30 transition-all",
                        canDrag ? "cursor-grab active:cursor-grabbing" : "opacity-80",
                        isOverdue(task.dueDate) && task.status !== 'Completed' && "border-voice-danger-border bg-voice-danger-faint hover:border-voice-danger border-l-4 border-l-voice-danger"
                      )}>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {canDrag && (
                            <GripVertical className="w-4 h-4 text-voice-muted/30 group-hover:text-voice-muted/60 transition-colors" />
                          )}
                        
                          <div className="flex flex-col gap-2 flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <select
                                value={task.status}
                                onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                                className={cn(
                                  "text-[10px] font-bold px-2.5 py-1 rounded-full border appearance-none cursor-pointer focus:outline-none shrink-0 transition-all uppercase tracking-wider",
                                  getStatusColor(task.status)
                                )}
                              >
                                <option value="To Do" className="bg-voice-surface text-voice-text">To Do</option>
                                <option value="In Progress" className="bg-voice-surface text-voice-info">In Progress</option>
                                <option value="Completed" className="bg-voice-surface text-voice-success">Completed</option>
                              </select>
                              
                              {editingTaskId === task.id ? (
                                <input
                                  type="text"
                                  value={editingTaskTitle}
                                  onChange={(e) => setEditingTaskTitle(e.target.value)}
                                  onBlur={handleSaveEditing}
                                  onKeyDown={handleKeyDown}
                                  autoFocus
                                  className="bg-voice-surface border border-voice-accent rounded-lg px-3 py-1 text-sm text-voice-text focus:outline-none flex-1 min-w-0 shadow-sm"
                                />
                              ) : (
                                <span 
                                  onClick={() => handleStartEditing(task)}
                                  className={cn(
                                    "text-sm text-voice-text cursor-pointer hover:text-voice-accent transition-colors truncate font-semibold", 
                                    task.status === 'Completed' && "line-through text-voice-muted opacity-60"
                                  )}
                                  title="Click to edit"
                                >
                                  {task.title}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-voice-muted">
                              <div className="flex items-center gap-2">
                                <span className="uppercase tracking-tighter opacity-50 font-bold">Priority</span>
                                <select
                                  value={task.priority}
                                  onChange={(e) => handlePriorityChange(task.id, e.target.value as Task['priority'])}
                                  className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-md border appearance-none cursor-pointer focus:outline-none shrink-0 transition-colors uppercase",
                                    getPriorityColor(task.priority)
                                  )}
                                  title="Change Priority"
                                >
                                  <option value="High" className="bg-voice-surface text-voice-danger">High</option>
                                  <option value="Medium" className="bg-voice-surface text-voice-warning">Medium</option>
                                  <option value="Low" className="bg-voice-surface text-voice-blue-bright">Low</option>
                                </select>
                              </div>

                              {task.dueDate && (
                                <div className={cn(
                                  "flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-voice-frost border border-voice-frost-border",
                                  isOverdue(task.dueDate) && task.status !== 'Completed' ? "text-voice-danger bg-voice-danger-faint border-voice-danger-border" : ""
                                )}>
                                  <Calendar className="w-3 h-3" />
                                  <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                                  {isOverdue(task.dueDate) && task.status !== 'Completed' && (
                                    <AlertCircle className="w-3 h-3 animate-pulse" />
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-1.5 opacity-50">
                                <Clock className="w-3 h-3" />
                                <span>Added {new Date(task.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pl-2">
                          {deleteConfirmationId === task.id ? (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                              <span className="text-xs text-voice-danger font-medium">Sure?</span>
                              <button 
                                onClick={() => confirmDelete(task.id)}
                                className="text-xs bg-voice-danger-faint text-voice-danger px-2 py-1 rounded hover:bg-voice-danger-border transition-colors"
                              >
                                Yes
                              </button>
                              <button 
                                onClick={cancelDelete}
                                className="text-xs bg-voice-surface text-voice-text border border-voice-border px-2 py-1 rounded hover:bg-voice-border transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleDeleteClick(task.id)}
                              className="text-voice-muted hover:text-voice-danger opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ onCreateAgent }: { onCreateAgent: () => void }) => (
  <OverviewDashboard onCreateAgent={onCreateAgent} />
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-voice-surface border border-voice-frost-border p-4 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-voice-muted text-[10px] uppercase tracking-wider font-bold mb-2">{label} Performance</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                <span className="text-xs text-voice-text/70">{entry.name}</span>
              </div>
              <span className="text-xs font-mono font-bold text-voice-text">{entry.value}{entry.dataKey === 'success' ? '%' : 's'}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-voice-frost-border flex items-center justify-between gap-8">
            <span className="text-[10px] text-voice-muted uppercase">Total Calls</span>
            <span className="text-xs font-mono text-voice-accent">{payload[0].payload.calls}</span>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className="text-[10px] text-voice-muted uppercase">Avg Latency</span>
            <span className="text-xs font-mono text-voice-blue-bright">{payload[0].payload.latency}ms</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const SandboxView = ({ agents, onUpdateAgent }: { agents: Agent[], onUpdateAgent: (agent: Agent) => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeAgentId, setActiveAgentId] = useState<number | null>(
    location.state?.agentId || agents[0]?.id || null,
  );
  const activeAgent = agents.find(a => a.id === activeAgentId) || agents[0];
  const orgId = getActiveOrgId();

  const {
    status,
    messages,
    error,
    latencyMs,
    isActive,
    activeLanguage,
    geminiEnabled,
    groqEnabled,
    scribeSttEnabled,
    scribeRealtimeEnabled,
    interruptCount,
    interimTranscript,
    sttFallbackWarning,
    startSession,
    endSession,
    resetConversation,
  } = useVoiceAgentFromRecord(activeAgent, undefined, {
    autoStart: false,
    orgId,
    agentServerId: activeAgent?.serverId ?? null,
  });

  if (!agents.length || !activeAgent) {
    return (
      <div className="vfy-overview">
        <div className="vfy-page-head">
          <div className="vfy-page-head-titles">
            <p className="vfy-page-eyebrow">// sandbox</p>
            <h1 className="vfy-page-title">Sandbox</h1>
            <p className="vfy-page-sub">
              Create an agent first, then talk to it here with your microphone.
            </p>
          </div>
          <button
            type="button"
            className="vfy-btn vfy-btn-primary"
            onClick={() => navigate('/dashboard/agents')}
          >
            Go to agents
          </button>
        </div>
      </div>
    );
  }

  const [logs, setLogs] = useState<{sender: 'user' | 'agent' | 'system', text: string, timestamp: string, isoTimestamp: string}[]>([]);
  const [filterSender, setFilterSender] = useState<'All' | 'user' | 'agent' | 'system'>('All');
  const [filterStartTime, setFilterStartTime] = useState('');
  const [filterEndTime, setFilterEndTime] = useState('');
  const visualizerRef = useRef<HTMLDivElement>(null);
  const syncedMessageCountRef = useRef(0);

  const isLive = isActive && status !== 'idle' && status !== 'error';
  const langLabel = activeAgent ? resolveLanguageMode(activeAgent.language).toUpperCase() : 'AUTO';

  const addLog = (sender: 'user' | 'agent' | 'system', text: string) => {
    const now = new Date();
    setLogs(prev => [...prev, {
      sender,
      text,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isoTimestamp: now.toISOString()
    }]);
  };

  const handleGreetingChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (activeAgent) {
      onUpdateAgent({ ...activeAgent, greeting: e.target.value });
    }
  };

  useEffect(() => {
    if (location.state?.agentId) {
      setActiveAgentId(location.state.agentId);
    }
  }, [location.state]);

  useEffect(() => {
    if (messages.length <= syncedMessageCountRef.current) return;
    const fresh = messages.slice(syncedMessageCountRef.current);
    syncedMessageCountRef.current = messages.length;
    const now = new Date();
    const ts = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const iso = now.toISOString();
    setLogs(prev => [
      ...prev,
      ...fresh.map((m) => ({
        sender: m.role === 'user' ? 'user' as const : 'agent' as const,
        text: m.text,
        timestamp: ts,
        isoTimestamp: iso,
      })),
    ]);
  }, [messages]);

  useEffect(() => {
    if (error) addLog('system', error);
  }, [error]);

  useEffect(() => {
    if (visualizerRef.current) {
      const bars = visualizerRef.current.children;
      gsap.killTweensOf(bars);
      const animating = isLive && (status === 'listening' || status === 'speaking');

      if (animating) {
        Array.from(bars).forEach((bar: Element, i) => {
          const centerOffset = Math.abs(i - 9.5);
          const baseIntensity = Math.max(0.3, 1 - (centerOffset / 10));

          gsap.to(bar, {
            height: () => Math.max(4, Math.random() * 40 * baseIntensity + 8),
            duration: () => 0.1 + Math.random() * 0.15,
            ease: "power1.inOut",
            repeat: -1,
            yoyo: true,
            delay: Math.random() * 0.1
          });

          gsap.to(bar, {
            opacity: () => 0.7 + Math.random() * 0.3,
            duration: 0.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
          });
        });
      } else {
        Array.from(bars).forEach((bar: Element) => {
          gsap.to(bar, {
            height: 4,
            opacity: 0.3,
            duration: 0.5,
            ease: "power2.out"
          });
        });
      }
    }
  }, [isLive, status]);

  const handleAgentSwitch = (id: number) => {
    setActiveAgentId(id);
    syncedMessageCountRef.current = 0;
    setLogs([]);
  };

  const toggleRecording = async () => {
    if (isActive) {
      endSession({ userInitiated: true });
      addLog('system', 'Session ended');
      syncedMessageCountRef.current = 0;
    } else {
      syncedMessageCountRef.current = 0;
      setLogs([]);
      addLog('system', 'Connected to Voiceify voice pipeline (server-managed API keys)');
      await startSession();
    }
  };

  const clearLogs = () => {
    syncedMessageCountRef.current = 0;
    setLogs([]);
    resetConversation();
  };

  const userTurns = messages.filter((m) => m.role === 'user').length;
  const latencyGood = latencyMs != null && latencyMs < LATENCY_TARGET_MS;

  return (
    <div className="vfy-sandbox-page">
      <div className="vfy-sandbox-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">// sandbox · live mode</p>
          <h1 className="vfy-page-title">Testing sandbox</h1>
          <p className="vfy-page-sub">Test your agent&apos;s responses and latency in real-time.</p>
        </div>

        <div className="vfy-sandbox-controls">
          <div className="vfy-select-wrap" style={{ minWidth: 200 }}>
            <select value={activeAgent.id} onChange={(e) => handleAgentSwitch(Number(e.target.value))}>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name} ({agent.type})</option>
              ))}
            </select>
            <ChevronDown size={14} className="vfy-select-chevron" />
          </div>
        </div>
      </div>

      <div className="vfy-panel vfy-sandbox-greeting">
        <div className="vfy-panel-head" style={{ paddingBottom: 8 }}>
          <h3 className="vfy-panel-title" style={{ fontSize: 13 }}>
            <MessageSquarePlus size={14} />
            Custom greeting
          </h3>
        </div>
        <textarea
          value={activeAgent?.greeting || ''}
          onChange={handleGreetingChange}
          placeholder={`Leave empty for optimized persona greeting (like /demo). Or enter a short custom line for ${activeAgent?.name}…`}
          rows={3}
        />
      </div>

      <div className="vfy-sandbox-layout">
      <div className="vfy-sandbox-console">
        <div className="vfy-sandbox-console-head">
          <div className="flex items-center gap-3">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", isLive ? "bg-voice-status-online" : "bg-voice-logo-placeholder")}></div>
            <span className="text-sm font-medium text-voice-text">
              {isActive ? (
                <>Connected: <span className="text-voice-accent">{activeAgent?.name}</span></>
              ) : (
                <>Ready: <span className="text-voice-accent">{activeAgent?.name}</span></>
              )}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-voice-muted font-mono flex-wrap justify-end">
            <span className={cn(latencyGood && 'text-voice-success-bright')}>
              LATENCY: {latencyMs != null ? `${latencyMs}ms` : '--'}
              {latencyGood ? ' ✓' : ''}
              {latencyMs != null && !latencyGood ? ` / ${LATENCY_TARGET_MS}ms` : ''}
            </span>
            <span>LID: {langLabel} ({activeLanguage.toUpperCase()})</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full border transition-colors duration-500",
              scribeSttEnabled ? "bg-voice-success-faint text-voice-success-bright border-voice-success-border" :
              "bg-voice-frost text-voice-muted border-voice-frost-border"
            )}>
              STT: {scribeRealtimeEnabled ? 'SCRIBE REALTIME V2' : scribeSttEnabled ? 'BROWSER + SCRIBE' : 'BROWSER'}
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded-full border transition-colors duration-500",
              geminiEnabled ? "bg-voice-success-faint text-voice-success-bright border-voice-success-border" :
              "bg-voice-frost text-voice-muted border-voice-frost-border"
            )}>
              LLM: {groqEnabled ? 'GROQ' : geminiEnabled ? 'GEMINI' : 'FALLBACK'}
            </span>
            <span className="px-2 py-0.5 rounded-full border bg-voice-frost text-voice-muted border-voice-frost-border uppercase">
              {status}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b border-voice-frost-border flex items-center gap-4 bg-voice-scrim overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3 h-3 text-voice-muted" />
            <select
              value={filterSender}
              onChange={(e) => setFilterSender(e.target.value as any)}
              className="bg-voice-surface border border-voice-frost-border rounded-lg px-2 py-1 text-xs text-voice-text focus:outline-none focus:border-voice-accent cursor-pointer"
            >
              <option value="All">All Senders</option>
              <option value="user">User</option>
              <option value="agent">Agent</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Clock className="w-3 h-3 text-voice-muted" />
            <input
              type="time"
              value={filterStartTime}
              onChange={(e) => setFilterStartTime(e.target.value)}
              className="bg-voice-surface border border-voice-frost-border rounded-lg px-2 py-1 text-xs text-voice-text focus:outline-none focus:border-voice-accent"
            />
            <span className="text-voice-muted text-xs">-</span>
            <input
              type="time"
              value={filterEndTime}
              onChange={(e) => setFilterEndTime(e.target.value)}
              className="bg-voice-surface border border-voice-frost-border rounded-lg px-2 py-1 text-xs text-voice-text focus:outline-none focus:border-voice-accent"
            />
          </div>
          {(filterSender !== 'All' || filterStartTime || filterEndTime) && (
            <button
              onClick={() => {
                setFilterSender('All');
                setFilterStartTime('');
                setFilterEndTime('');
              }}
              className="text-xs text-voice-accent hover:underline ml-auto shrink-0"
            >
              Clear Filters
            </button>
          )}
        </div>

      {/* Conversation Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gradient-to-b from-black/20 to-transparent scroll-smooth">
        {logs.filter(log => {
          if (filterSender !== 'All' && log.sender !== filterSender) return false;
          if (filterStartTime) {
            const logTime = new Date(log.isoTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            if (logTime < filterStartTime) return false;
          }
          if (filterEndTime) {
            const logTime = new Date(log.isoTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            if (logTime > filterEndTime) return false;
          }
          return true;
        }).length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-voice-muted opacity-50">
            <Mic className="w-16 h-16 mb-4" />
            <p>Start the call to begin testing</p>
          </div>
        )}
        {logs.filter(log => {
          if (filterSender !== 'All' && log.sender !== filterSender) return false;
          if (filterStartTime) {
            const logTime = new Date(log.isoTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            if (logTime < filterStartTime) return false;
          }
          if (filterEndTime) {
            const logTime = new Date(log.isoTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            if (logTime > filterEndTime) return false;
          }
          return true;
        }).map((log, i) => (
          <div key={i} className={cn(
            "flex w-full animate-in slide-in-from-bottom-2 duration-300",
            log.sender === 'user' ? "justify-end" : log.sender === 'system' ? "justify-center" : "justify-start"
          )}>
            {log.sender === 'system' ? (
              <div className="bg-voice-frost border border-voice-frost-border rounded-full px-4 py-1.5 text-xs text-voice-muted flex items-center gap-2">
                <Activity className="w-3 h-3" />
                <span>{log.text}</span>
                <span className="opacity-50 border-l border-voice-frost-border pl-2 ml-1">{log.timestamp}</span>
              </div>
            ) : (
              <div className={cn(
                "max-w-[80%] p-4 rounded-2xl text-sm shadow-lg backdrop-blur-sm flex flex-col gap-1",
                log.sender === 'user' 
                  ? "bg-voice-accent text-voice-on-accent rounded-tr-none" 
                  : "bg-voice-frost-strong text-voice-text rounded-tl-none border border-voice-frost-border"
              )}>
                <p>{log.text}</p>
                <p className={cn(
                  "text-[10px] self-end opacity-60 font-mono",
                  log.sender === 'user' ? "text-voice-text/70" : "text-voice-muted"
                )}>{log.timestamp}</p>
              </div>
            )}
          </div>
        ))}
        {isActive && interimTranscript && status === 'listening' && (
          <div className="flex w-full justify-end animate-in fade-in duration-200">
            <div className="max-w-[80%] p-4 rounded-2xl text-sm border border-dashed border-voice-accent/40 bg-voice-accent/10 text-voice-text rounded-tr-none">
              <p className="opacity-80">{interimTranscript}</p>
              <p className="text-[10px] self-end opacity-60 font-mono text-voice-muted mt-1">listening…</p>
            </div>
          </div>
        )}
      </div>

        {/* Controls */}
        <div className="p-6 bg-voice-scrim border-t border-voice-frost-border backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6">
            {/* Visualizer */}
            <div ref={visualizerRef} className="flex items-center justify-center gap-1 h-12 w-64">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="w-1.5 bg-voice-accent rounded-full h-1 opacity-30"></div>
              ))}
            </div>

            <div className="flex items-center gap-8">
              <button className="p-4 rounded-full bg-voice-frost hover:bg-voice-frost-hover text-voice-text transition-colors group" title="Settings">
                <Settings className="w-6 h-6 group-hover:rotate-45 transition-transform" />
              </button>
              
              <button 
                type="button"
                onClick={toggleRecording}
                disabled={status === 'connecting'}
                className={cn(
                  'vfy-sandbox-mic',
                  isActive && 'is-active',
                )}
                aria-label={isActive ? 'End call' : 'Start call'}
              >
                {isActive ? (
                  <Phone className="vfy-sandbox-mic-icon is-hangup" strokeWidth={2.25} />
                ) : (
                  <Mic className="vfy-sandbox-mic-icon" strokeWidth={2.25} />
                )}
              </button>

              <button 
                className="p-4 rounded-full bg-voice-frost hover:bg-voice-frost-hover text-voice-text transition-colors group" 
                title="Clear logs"
                onClick={clearLogs}
              >
                <RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-transform" />
              </button>
            </div>
            <p className="text-xs text-voice-muted font-medium tracking-wide uppercase">
              {status === 'connecting'
                ? 'Connecting…'
                : isActive
                  ? status === 'listening'
                    ? 'Listening…'
                    : status === 'speaking'
                      ? 'Speaking…'
                      : status
                  : status === 'error'
                    ? 'Error — tap mic to retry'
                    : 'Tap mic to start'}
            </p>
            {sttFallbackWarning && (
              <p className="text-xs text-voice-warning text-center max-w-md">{sttFallbackWarning}</p>
            )}
          </div>
        </div>
      </div>

      {/* Right Column - Stats */}
      <div className="vfy-sandbox-side">
        <div className="vfy-panel">
          <div className="vfy-panel-head">
            <h3 className="vfy-panel-title">Performance metrics</h3>
          </div>
          <div className="vfy-panel-body--padded" style={{ paddingTop: 0 }}>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Mon', duration: 120, success: 85, calls: 45, latency: 124 },
                  { name: 'Tue', duration: 150, success: 88, calls: 52, latency: 118 },
                  { name: 'Wed', duration: 180, success: 92, calls: 68, latency: 132 },
                  { name: 'Thu', duration: 140, success: 90, calls: 48, latency: 121 },
                  { name: 'Fri', duration: 160, success: 95, calls: 74, latency: 115 },
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-voice-chart-grid)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--color-voice-chart-axis)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="var(--color-voice-chart-axis)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{fill: 'var(--color-voice-chart-cursor)'}}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle" 
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', color: 'var(--color-voice-chart-tooltip)' }}
                />
                <Bar dataKey="duration" name="Duration (s)" fill="var(--color-voice-chart-bar-a)" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="success" name="Success Rate (%)" fill="var(--color-voice-chart-bar-b)" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          </div>
        </div>

        <div className="vfy-panel">
          <div className="vfy-panel-head">
            <h3 className="vfy-panel-title">Session stats</h3>
          </div>
          <ul className="vfy-defs">
            <li>
              <span className="vfy-defs-key">Avg response</span>
              <span className={cn('vfy-defs-val', latencyGood && 'text-voice-success-bright')}>
                {latencyMs != null ? `${latencyMs}ms` : '--'}
                {latencyGood ? ' ✓' : latencyMs != null ? ` / ${LATENCY_TARGET_MS}ms` : ''}
              </span>
            </li>
            <li>
              <span className="vfy-defs-key">User turns</span>
              <span className="vfy-defs-val">{userTurns || '--'}</span>
            </li>
            <li>
              <span className="vfy-defs-key">Interrupt rate</span>
              <span className="vfy-defs-val">{isActive && userTurns > 0 ? `${Math.round((interruptCount / userTurns) * 100)}%` : '--'}</span>
            </li>
            <li>
              <span className="vfy-defs-key">Voice stack</span>
              <span className="vfy-defs-val">{isActive ? 'Server-managed' : '--'}</span>
            </li>
            <li>
              <span className="vfy-defs-key">Status</span>
              <span className="vfy-defs-val">{status}</span>
            </li>
          </ul>
        </div>
      </div>
      </div>
    </div>
  );
};

const AgentsView = ({
  agents,
  onCreateAgent,
  onDeleteAgent,
  onEditAgent,
  onManageTasks,
}: {
  agents: Agent[];
  onCreateAgent: () => void;
  onDeleteAgent: (agent: Agent) => void;
  onEditAgent: (agent: Agent) => void;
  onManageTasks: (agent: Agent) => void;
}) => {
  const navigate = useNavigate();
  const orgId = getActiveOrgId();
  const { refreshFromApi } = useAgentStore();
  const [packBusy, setPackBusy] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [packMessage, setPackMessage] = useState<string | null>(null);

  const templates = [
    {
      packId: 'restaurant',
      name: 'Restaurant host',
      blurb: 'Reservations, menu questions, waitlist.',
    },
    {
      packId: 'receptionist',
      name: 'Front-desk receptionist',
      blurb: 'Routing, FAQ, department handoff.',
    },
    {
      packId: 'appointments',
      name: 'Appointments desk',
      blurb: 'Booking, intake, reminders.',
    },
  ] as const;

  const installTemplate = async (packId: string) => {
    if (!orgId) {
      setPackError('Select a workspace first.');
      return;
    }
    setPackBusy(true);
    setPackError(null);
    setPackMessage(null);
    try {
      await apiJson(`/api/orgs/${orgId}/automations/install`, {
        method: 'POST',
        body: JSON.stringify({ packId, createAgent: true }),
      });
      await refreshFromApi();
      setPackMessage(`Installed ${packId}. Open Sandbox to test.`);
    } catch (err) {
      setPackError(err instanceof Error ? err.message : 'Could not install template');
    } finally {
      setPackBusy(false);
    }
  };

  const perfData: Record<number, { calls: number; success: number; latency: number }> = {
    1: { calls: 47,  success: 97.8, latency: 380 },
    2: { calls: 12,  success: 94.2, latency: 420 },
    3: { calls: 103, success: 98.9, latency: 290 },
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'Healthcare':       return 'var(--d-accent)';
      case 'Real Estate':      return 'var(--d-text-2)';
      case 'Customer Service': return 'var(--d-muted)';
      default:                 return 'var(--d-accent)';
    }
  };

  const getIconBg = (type: string) => {
    return 'var(--d-accent-soft)';
  };

  const renderIcon = (type: string, color: string) => {
    if (type === 'Healthcare') return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="20" cy="20" r="3" />
        <path d="M7 4v8a7 7 0 0 0 6 6.93V20a3 3 0 0 0 6 0v-1" />
        <path d="M7 4H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2" />
        <path d="M7 4h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H7" />
      </svg>
    );
    if (type === 'Real Estate') return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12L14 3l11 9" />
        <path d="M5 10v13h6v-7h6v7h6V10" />
      </svg>
    );
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16v-4a10 10 0 0 1 20 0v4" />
        <rect x="2" y="15" width="4" height="7" rx="2" />
        <rect x="22" y="15" width="4" height="7" rx="2" />
        <path d="M22 22a6 6 0 0 1-6 4h-2" />
      </svg>
    );
  };

  return (
    <div className="vfy-agents-page">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">// agents · {agents.length} active</p>
          <h1 className="vfy-page-title">Agents</h1>
          <p className="vfy-page-sub">Manage AI personas, voices, and triggers across your organization.</p>
        </div>
      </div>

      <section className="vfy-settings-card" style={{ marginBottom: 24 }}>
        <h3 className="vfy-settings-card-title">Start from a pre-built pack</h3>
        <p className="vfy-settings-help">
          Install Restaurant, Receptionist, or Appointments. Each pack creates an agent, pack tools,
          and seed data ready for Sandbox.
        </p>
        {packError && (
          <p className="text-sm" role="alert" style={{ color: 'var(--d-danger)' }}>
            {packError}
          </p>
        )}
        {packMessage && (
          <p className="text-sm" role="status" style={{ color: 'var(--d-accent)' }}>
            {packMessage}
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-3" style={{ marginTop: 12 }}>
          {templates.map((t) => (
            <article key={t.packId} className="vfy-settings-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <p className="vfy-settings-item-title">{t.name}</p>
              <p className="vfy-settings-item-meta">{t.blurb}</p>
              <button
                type="button"
                className="vfy-btn vfy-btn-primary"
                style={{ marginTop: 10 }}
                disabled={packBusy || !orgId}
                onClick={() => void installTemplate(t.packId)}
              >
                {packBusy ? 'Installing…' : 'Install to workspace'}
              </button>
            </article>
          ))}
        </div>
      </section>

      <div className="vfy-agents-grid">
        {agents.map(agent => {
          const perf = perfData[agent.id] ?? { calls: 0, success: 0, latency: 0 };
          const color = getIconColor(agent.type);
          const isOnline = agent.status === 'Active';
          return (
            <div key={agent.id} className="agent-card">
              <div className="ac-top">
                <div className="ac-icon" style={{ background: getIconBg(agent.type) }}>
                  {renderIcon(agent.type, color)}
                </div>
                <div className="ac-status">
                  <span className={`status-dot ${isOnline ? 'active' : 'idle'}`} />
                  <span className="status-txt">{isOnline ? 'Online' : 'Idle'}</span>
                </div>
              </div>
              <p className="ac-name">{agent.name}</p>
              <p className="ac-domain">{agent.type}</p>
              <div className="ac-stats">
                <div className="ac-stat">
                  <span className="as-val">{perf.calls}</span>
                  <span className="as-key">calls today</span>
                </div>
                <div className="ac-stat">
                  <span className="as-val">{perf.success}%</span>
                  <span className="as-key">success</span>
                </div>
                <div className="ac-stat">
                  <span className="as-val">{perf.latency}ms</span>
                  <span className="as-key">avg latency</span>
                </div>
              </div>
              <div className="ac-footer">
                <button className="btn-sandbox" onClick={() => navigate('/dashboard/sandbox', { state: { agentId: agent.id } })}>
                  Test in Sandbox
                </button>
                <button className="btn-cfg" onClick={() => onEditAgent(agent)}>
                  Configure ›
                </button>
              </div>
            </div>
          );
        })}

        <button type="button" onClick={onCreateAgent} className="agent-card-create">
          <svg className="create-icon" width="40" height="40" viewBox="0 0 40 40" fill="none" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="20" cy="20" r="16" />
            <path d="M20 13v14M13 20h14" />
          </svg>
          <span className="create-text">Create new agent</span>
        </button>
      </div>
    </div>
  );
};


const SettingsView = () => <SettingsWorkspace focus="settings" />;
const ApiKeysView = () => <SettingsWorkspace focus="api-keys" />;

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, agentName }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, agentName: string }) => {
  if (!isOpen) return null;

  return (
    <div
      className="vfy-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="vfy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vfy-modal-head">
          <p className="vfy-modal-eyebrow">// destructive action</p>
          <h2 className="vfy-modal-title">Delete agent?</h2>
        </div>
        <div className="vfy-modal-body">
          You are about to permanently remove{' '}
          <span style={{ color: 'var(--d-text)', fontFamily: 'var(--d-mono)', fontSize: 13 }}>"{agentName}"</span>.
          This will delete all associated tasks and call logs. This action cannot be undone.
        </div>
        <div className="vfy-modal-foot">
          <button onClick={onClose} className="vfy-btn vfy-btn-ghost">Cancel</button>
          <button onClick={onConfirm} className="vfy-btn vfy-btn-danger">Delete agent</button>
        </div>
      </div>
    </div>
  );
};

const AnalyticsView = () => <AnalyticsDashboard />;

const AgentDetailView = ({ 
  agents, 
  onManageTasks, 
  onEditAgent 
}: { 
  agents: Agent[], 
  onManageTasks: (agent: Agent) => void, 
  onEditAgent: (agent: Agent) => void 
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const agent = agents.find(a => a.id === Number(id));

  if (!agent) {
    return (
      <div className="vfy-panel" style={{ padding: 64, textAlign: 'center' }}>
        <Users size={36} color="var(--d-dim)" style={{ marginBottom: 12 }} />
        <h3 style={{ color: 'var(--d-text)', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>
          Agent not found
        </h3>
        <button
          onClick={() => navigate('/dashboard/agents')}
          className="vfy-btn vfy-btn-ghost"
          style={{ marginTop: 12 }}
        >
          ← Back to agents
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="vfy-page-head">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0, flex: 1 }}>
          <button
            onClick={() => navigate('/dashboard/agents')}
            className="vfy-back-btn"
            aria-label="Back to agents"
            style={{ marginTop: 18 }}
          >
            <ChevronDown size={15} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <div className="vfy-page-head-titles">
            <p className="vfy-page-eyebrow">// agent · {agent.type.toLowerCase()}</p>
            <h1 className="vfy-page-title">{agent.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <span style={{ fontFamily: 'var(--d-mono)', fontSize: 11, color: 'var(--d-muted)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Globe size={12} />
                {agent.language}
              </span>
              <span style={{ color: 'var(--d-dim)' }}>·</span>
              <span style={{ fontFamily: 'var(--d-mono)', fontSize: 11, color: 'var(--d-muted)' }}>
                {agent.type}
              </span>
              <span className={`vfy-pill ${agent.status === 'Active' ? 'vfy-pill-success' : 'vfy-pill-neutral'}`}>
                {agent.status}
              </span>
            </div>
          </div>
        </div>
        <div className="vfy-page-actions">
          <button onClick={() => onManageTasks(agent)} className="vfy-btn vfy-btn-ghost">
            <CheckCircle2 size={14} />
            Manage tasks
          </button>
          <button onClick={() => onEditAgent(agent)} className="vfy-btn vfy-btn-primary">
            <Pencil size={14} />
            Edit profile
          </button>
        </div>
      </div>

      <div className="vfy-grid-2-1">
        {/* Left column */}
        <div className="vfy-stack">
          {/* KPI tiles */}
          <div className="vfy-grid-3">
            <div className="vfy-tile">
              <p className="vfy-tile-label">Total calls</p>
              <p className="vfy-tile-value">1,248</p>
            </div>
            <div className="vfy-tile">
              <p className="vfy-tile-label">Avg duration</p>
              <p className="vfy-tile-value">2m 14s</p>
            </div>
            <div className="vfy-tile">
              <p className="vfy-tile-label">Success rate</p>
              <p className="vfy-tile-value">98.2%</p>
            </div>
          </div>

          {/* Tasks */}
          <div className="vfy-panel">
            <div className="vfy-panel-head">
              <h3 className="vfy-panel-title">
                <CheckCircle2 size={14} />
                Tasks &amp; goals
              </h3>
              <span className="vfy-panel-sub">
                {(agent.tasks ?? []).filter(t => t.status === 'Completed').length}/{(agent.tasks ?? []).length} done
              </span>
            </div>
            <div className="vfy-panel-body">
              {(agent.tasks ?? []).length === 0 ? (
                <p style={{ color: 'var(--d-muted)', fontSize: 13, textAlign: 'center', padding: '32px 16px', margin: 0 }}>
                  No tasks assigned yet.
                </p>
              ) : (
                (agent.tasks ?? []).map(task => (
                  <div key={task.id} className="vfy-svc">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          flexShrink: 0,
                          background:
                            task.status === 'Completed'
                              ? 'var(--d-accent)'
                              : task.status === 'In Progress'
                                ? 'var(--d-info)'
                                : 'var(--d-dim)',
                          boxShadow:
                            task.status === 'Completed'
                              ? '0 0 6px var(--d-accent)'
                              : task.status === 'In Progress'
                                ? '0 0 6px var(--d-info)'
                                : 'none',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          color: task.status === 'Completed' ? 'var(--d-muted)' : 'var(--d-text)',
                          textDecoration: task.status === 'Completed' ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {task.priority && (
                        <span
                          className={`vfy-pill ${
                            task.priority === 'High'
                              ? 'vfy-pill-danger'
                              : task.priority === 'Medium'
                                ? 'vfy-pill-warn'
                                : 'vfy-pill-info'
                          }`}
                        >
                          {task.priority}
                        </span>
                      )}
                      {task.dueDate && (
                        <span style={{ fontFamily: 'var(--d-mono)', fontSize: 11, color: 'var(--d-muted)' }}>
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="vfy-panel">
            <div className="vfy-panel-head">
              <h3 className="vfy-panel-title">
                <Activity size={14} />
                Recent activity
              </h3>
              <span className="vfy-panel-sub">last 24h</span>
            </div>
            <div className="vfy-panel-body">
              {[
                { when: '2 hours ago', dur: '4:12', label: 'success' as const, text: 'Completed' },
                { when: '5 hours ago', dur: '2:48', label: 'success' as const, text: 'Completed' },
                { when: 'yesterday',   dur: '1:02', label: 'warn'    as const, text: 'Escalated' },
              ].map((row, i) => (
                <div key={i} className="vfy-row" style={{ gridTemplateColumns: '36px minmax(0,1fr) auto auto' }}>
                  <span className="vfy-row-avatar">IN</span>
                  <div className="vfy-row-meta">
                    <p className="vfy-row-name">Incoming call</p>
                    <p className="vfy-row-sub">{row.when} · {row.dur}</p>
                  </div>
                  <span className={`vfy-pill vfy-pill-${row.label}`}>{row.text}</span>
                  <button type="button" className="vfy-row-action" aria-label="Play recording">
                    <Play size={12} fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="vfy-stack">
          <div className="vfy-panel">
            <div className="vfy-panel-head">
              <h3 className="vfy-panel-title">
                <Sparkles size={14} />
                Capabilities
              </h3>
            </div>
            <div className="vfy-panel-body--padded">
              <div className="vfy-tag-list">
                {(agent.capabilities ?? []).map((cap, i) => (
                  <span key={i} className="vfy-tag">{cap}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="vfy-panel">
            <div className="vfy-panel-head">
              <h3 className="vfy-panel-title">
                <Server size={14} />
                System info
              </h3>
            </div>
            <ul className="vfy-defs">
              <li><span className="vfy-defs-key">Created</span><span className="vfy-defs-val">{agent.createdAt}</span></li>
              <li><span className="vfy-defs-key">Last updated</span><span className="vfy-defs-val">{agent.updatedAt}</span></li>
              <li><span className="vfy-defs-key">Model</span><span className="vfy-defs-val">gemini-2.5-flash</span></li>
              <li><span className="vfy-defs-key">Voice ID</span><span className="vfy-defs-val">{agent.voice}</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper: pick a friendly title for the topbar based on the current pathname.
 */
function useDashCrumbs(): { label: string; to?: string }[] {
  const { pathname } = useLocation();
  return buildDashboardCrumbs(pathname);
}

function DashboardChrome({
  sideOpen,
  onSideClose,
  onSideOpen,
  onCreateAgent,
  children,
}: {
  sideOpen: boolean;
  onSideClose: () => void;
  onSideOpen: () => void;
  onCreateAgent: () => void;
  children: React.ReactNode;
}) {
  const crumbs = useDashCrumbs();
  const { pathname } = useLocation();

  /* The Create-Agent CTA only makes sense on Overview + Agents. */
  const showCreate = pathname === '/dashboard' || pathname === '/dashboard/' || pathname.startsWith('/dashboard/agents');

  return (
    <div className="vfy-dash">
      <div className="vfy-dash-shell">
        <Sidebar isOpen={sideOpen} onClose={onSideClose} />
        <div className="vfy-dash-main">
          <DashboardTopbar
            crumbs={crumbs}
            onMenuClick={onSideOpen}
            actions={
              showCreate ? (
                <button type="button" className="vfy-top-cta" onClick={onCreateAgent}>
                  <Plus size={14} strokeWidth={2.4} />
                  <span className="vfy-top-cta-label">New Agent</span>
                </button>
              ) : null
            }
          />
          <div className="vfy-dash-content">
            <div className="vfy-route-view">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { agents, setAgents, updateAgent, createAgent, deleteAgent } = useAgentStore();
  const dashboardAgents = asDashboardAgents(agents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);
  const [taskAgent, setTaskAgent] = useState<Agent | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const handleSideClose = useCallback(() => setSideOpen(false), []);
  const handleSideOpen = useCallback(() => setSideOpen(true), []);

  const handleSaveAgent = (agentData: AppAgent) => {
    void (async () => {
      if (editingAgent) {
        updateAgent(agentData);
      } else {
        try {
          await createAgent({ ...agentData, tasks: agentData.tasks ?? [], isDemoDefault: false });
        } catch {
          setAgents([...agents, { ...agentData, tasks: agentData.tasks ?? [] }]);
        }
      }
      setEditingAgent(null);
    })();
  };

  const handleUpdateTasks = (agentId: number, tasks: Task[]) => {
    const current = agents.find((a) => a.id === agentId);
    if (current) updateAgent({ ...current, tasks });
    if (taskAgent && taskAgent.id === agentId) {
      setTaskAgent({ ...taskAgent, tasks });
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingAgent) return;
    void (async () => {
      try {
        await deleteAgent(deletingAgent as AppAgent);
      } catch {
        setAgents(agents.filter((a) => a.id !== deletingAgent.id));
      }
      setDeletingAgent(null);
      setIsDeleteModalOpen(false);
    })();
  };

  const handleDeleteClick = (agent: Agent) => {
    setDeletingAgent(agent);
    setIsDeleteModalOpen(true);
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setIsModalOpen(true);
  };

  const handleAgentUpdate = (updatedAgent: Agent) => {
    updateAgent(updatedAgent);
  };

  const handleManageTasks = (agent: Agent) => {
    setTaskAgent(agent);
    setIsTasksModalOpen(true);
  };

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setIsModalOpen(true);
  };

  return (
    <DashboardChrome
      sideOpen={sideOpen}
      onSideClose={handleSideClose}
      onSideOpen={handleSideOpen}
      onCreateAgent={handleCreateAgent}
    >
      <AgentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAgent(null);
        }}
        onSave={handleSaveAgent}
        initialData={editingAgent}
      />

      <AgentTasksModal
        isOpen={isTasksModalOpen}
        onClose={() => {
          setIsTasksModalOpen(false);
          setTaskAgent(null);
        }}
        agent={taskAgent}
        onUpdateTasks={handleUpdateTasks}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingAgent(null);
        }}
        onConfirm={handleConfirmDelete}
        agentName={deletingAgent?.name || ''}
      />

      <Routes>
        <Route index element={<DashboardView onCreateAgent={handleCreateAgent} />} />
        <Route
          path="agents"
          element={
            <AgentsView
              agents={dashboardAgents}
              onCreateAgent={handleCreateAgent}
              onDeleteAgent={handleDeleteClick}
              onEditAgent={handleEditAgent}
              onManageTasks={handleManageTasks}
            />
          }
        />
        <Route
          path="agents/:id"
          element={
            <AgentDetailView
              agents={dashboardAgents}
              onManageTasks={handleManageTasks}
              onEditAgent={handleEditAgent}
            />
          }
        />
        <Route path="sandbox" element={<SandboxView agents={dashboardAgents} onUpdateAgent={handleAgentUpdate} />} />
        <Route path="knowledge" element={<KnowledgeWorkspace />} />
        <Route path="tools" element={<ToolsWorkspace />} />
        <Route path="voices" element={<VoicesWorkspace />} />
        <Route path="workflows" element={<WorkflowsWorkspace />} />
        <Route path="conversations" element={<ConversationsWorkspace />} />
        <Route path="guardrails" element={<GuardrailsWorkspace />} />
        <Route path="settings" element={<SettingsView />} />
        <Route path="api-keys" element={<ApiKeysView />} />
        <Route path="analytics" element={<AnalyticsView />} />
        <Route path="integrations" element={<IntegrationsWorkspace />} />
      </Routes>
    </DashboardChrome>
  );
}
