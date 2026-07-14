/**
 * PHASE 1 AUDIT — DashboardLayout.tsx
 * - Removed unused lucide-react imports (Home, Library, GalleryVerticalEnd, Film, FileVideo, Key, CreditCard).
 * - Replaced hardcoded hex/rgba in charts and motion styles with CSS variables.
 * - Replaced raw Tailwind palette utilities (black/white/gray/emerald/red/blue/amber/indigo/yellow) with voice-* tokens.
 */
import React, { useEffect, useRef, useState } from 'react';
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
import '../dashboard.css';
import { useVoiceAgentFromRecord } from '../lib/voice-agent/useVoiceAgentFromRecord';
import { useAgentStore } from '../lib/agents/AgentStoreContext';
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

const AgentModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData,
  clonedVoices = [],
  onVoiceCloned
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (agent: Agent) => void, 
  initialData?: Agent | null,
  clonedVoices?: string[],
  onVoiceCloned?: (voiceName: string) => void
}) => {
  const [formData, setFormData] = useState<{
    name: string;
    type: string;
    language: string;
    status: string;
    capabilities: string[];
    voice: string;
    triggers: string[];
    greeting: string;
  }>({
    name: '',
    type: 'Healthcare',
    language: 'English',
    status: 'Active',
    capabilities: [],
    voice: 'Puck',
    triggers: [],
    greeting: ''
  });
  const [newCapability, setNewCapability] = useState('');
  const [newTrigger, setNewTrigger] = useState('');
  const [errors, setErrors] = useState<{name?: string}>({});
  const [isCloning, setIsCloning] = useState(false);
  const [cloningStatus, setCloningStatus] = useState<'idle' | 'uploading' | 'processing'>('idle');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        type: initialData.type,
        language: initialData.language,
        status: initialData.status,
        capabilities: initialData.capabilities || [],
        voice: initialData.voice || 'Puck',
        triggers: initialData.triggers || [],
        greeting: initialData.greeting || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'Healthcare',
        language: 'English',
        status: 'Active',
        capabilities: [],
        voice: 'Puck',
        triggers: [],
        greeting: ''
      });
    }
  }, [initialData, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: {name?: string} = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({ 
      ...formData, 
      id: initialData?.id || Date.now(),
      createdAt: initialData?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      capabilities: formData.capabilities,
      triggers: formData.triggers,
      greeting: formData.greeting,
      tasks: initialData?.tasks || []
    });
    setFormData({
      name: '',
      type: 'Healthcare',
      language: 'English',
      status: 'Active',
      capabilities: [],
      voice: 'Puck',
      triggers: [],
      greeting: ''
    });
    setErrors({});
    onClose();
  };

  const handleAddCapability = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newCapability.trim()) {
      e.preventDefault();
      if (!formData.capabilities.includes(newCapability.trim())) {
        setFormData({
          ...formData,
          capabilities: [...formData.capabilities, newCapability.trim()]
        });
      }
      setNewCapability('');
    }
  };

  const removeCapability = (capToRemove: string) => {
    setFormData({
      ...formData,
      capabilities: formData.capabilities.filter(cap => cap !== capToRemove)
    });
  };

  const handleAddTrigger = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTrigger.trim()) {
      e.preventDefault();
      if (!formData.triggers.includes(newTrigger.trim())) {
        setFormData({
          ...formData,
          triggers: [...formData.triggers, newTrigger.trim()]
        });
      }
      setNewTrigger('');
    }
  };

  const removeTrigger = (triggerToRemove: string) => {
    setFormData({
      ...formData,
      triggers: formData.triggers.filter(t => t !== triggerToRemove)
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-voice-backdrop backdrop-blur-sm" 
      role="dialog" 
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="bg-voice-surface border border-voice-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-voice-text mb-4">{initialData ? 'Edit Agent' : 'Create New Agent'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-voice-muted mb-1">Agent Name</label>
            <input
              type="text"
              autoFocus
              className={cn(
                "w-full bg-voice-bg border rounded-xl px-4 py-2 text-voice-text focus:outline-none focus:border-voice-accent transition-colors shadow-sm",
                errors.name ? "border-voice-danger focus:border-voice-danger" : "border-voice-border"
              )}
              value={formData.name}
              onChange={e => {
                setFormData({...formData, name: e.target.value});
                if (errors.name) setErrors({...errors, name: undefined});
              }}
              placeholder="e.g. Dr. Sarah"
            />
            {errors.name && (
              <p className="text-voice-danger text-xs mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-voice-muted mb-1">Type</label>
            <input
              list="agent-types"
              className="w-full bg-voice-bg border border-voice-border rounded-xl px-4 py-2 text-voice-text focus:outline-none focus:border-voice-accent shadow-sm"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
              placeholder="Select or type custom..."
            />
            <datalist id="agent-types">
              <option value="Healthcare" />
              <option value="Real Estate" />
              <option value="Customer Service" />
              <option value="Education" />
            </datalist>
          </div>
          <div className="vfy-field">
            <label className="vfy-field-label">Language</label>
            <select
              className="vfy-field-select"
              value={formData.language}
              onChange={e => setFormData({...formData, language: e.target.value})}
            >
              <option value="English">English</option>
              <option value="Urdu">Urdu</option>
              <option value="English/Urdu">English/Urdu (Mixed)</option>
            </select>
          </div>
          <div className="vfy-field">
            <label className="vfy-field-label">Status</label>
            <select
              className="vfy-field-select"
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="vfy-field">
            <label className="vfy-field-label">Voice persona</label>
            <div className="vfy-field-row">
              <select
                className="vfy-field-select"
                value={formData.voice}
                onChange={e => setFormData({...formData, voice: e.target.value})}
              >
                <optgroup label="Standard Voices">
                  <option value="Puck">Puck (Male, Energetic)</option>
                  <option value="Charon">Charon (Male, Deep)</option>
                  <option value="Kore">Kore (Female, Soft)</option>
                  <option value="Fenrir">Fenrir (Male, Rough)</option>
                  <option value="Zephyr">Zephyr (Female, Calm)</option>
                </optgroup>
                {clonedVoices.length > 0 && (
                  <optgroup label="Cloned Voices">
                    {clonedVoices.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </optgroup>
                )}
                {formData.voice.startsWith('Custom:') && !clonedVoices.includes(formData.voice) && (
                  <optgroup label="Current Custom Voice">
                    <option value={formData.voice}>{formData.voice}</option>
                  </optgroup>
                )}
              </select>
              <button
                type="button"
                onClick={() => setIsCloning(!isCloning)}
                className={cn('vfy-btn vfy-btn-ghost', isCloning && 'vfy-btn-primary')}
                title="Clone Voice"
              >
                <Mic className="w-4 h-4" />
                <span className="hidden sm:inline">Clone voice</span>
              </button>
            </div>
            
            {isCloning && (
              <div className="vfy-clone-panel">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-voice-text flex items-center gap-2">
                      <Zap className="w-3 h-3 text-voice-accent" />
                      Instant Voice Cloning
                    </h4>
                    <p className="text-xs text-voice-muted mt-1">Upload a clear audio sample (1-2 mins) to create a custom voice profile.</p>
                  </div>
                </div>
                
                <div className="relative border-2 border-dashed border-voice-border rounded-xl p-6 text-center hover:border-voice-accent/50 hover:bg-voice-accent/5 transition-all cursor-pointer group">
                  <input 
                    type="file" 
                    accept="audio/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCloningStatus('uploading');
                        // Simulate upload delay
                        setTimeout(() => {
                          setCloningStatus('processing');
                          // Simulate processing delay
                          setTimeout(() => {
                            const customVoiceName = `Custom: ${file.name.replace(/\.[^/.]+$/, "")}`;
                            setFormData(prev => ({...prev, voice: customVoiceName}));
                            onVoiceCloned?.(customVoiceName);
                            setCloningStatus('idle');
                            setIsCloning(false);
                          }, 2000);
                        }, 1500);
                      }
                    }}
                    disabled={cloningStatus !== 'idle'}
                  />
                  
                  <div className="flex flex-col items-center justify-center gap-3 min-h-[80px]">
                    {cloningStatus === 'idle' ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-voice-surface border border-voice-border flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                          <Upload className="w-5 h-5 text-voice-muted group-hover:text-voice-accent transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-voice-text">Click to upload or drag and drop</p>
                          <p className="text-xs text-voice-muted">MP3, WAV, or M4A (max 10MB)</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-2 border-voice-border border-t-voice-accent animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-voice-accent animate-pulse" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-voice-text">
                            {cloningStatus === 'uploading' ? 'Uploading sample...' : 'Training voice model...'}
                          </p>
                          <p className="text-xs text-voice-muted mt-1">This usually takes about 10-20 seconds</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="vfy-field">
            <label className="vfy-field-label">Capabilities</label>
            <div className="vfy-tag-list">
              {formData.capabilities.map((cap) => (
                <span key={cap} className="vfy-tag">
                  {cap}
                  <button 
                    type="button"
                    onClick={() => removeCapability(cap)}
                    className="vfy-tag-remove"
                    title="Remove capability"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              list="capabilities-suggestions"
              className="vfy-field-input"
              value={newCapability}
              onChange={e => setNewCapability(e.target.value)}
              onKeyDown={handleAddCapability}
              placeholder="Type capability and press Enter..."
            />
            <datalist id="capabilities-suggestions">
              <option value="Appointment Booking" />
              <option value="Lead Qualification" />
              <option value="Customer Support" />
              <option value="Order Tracking" />
              <option value="Technical Support" />
              <option value="Symptom Check" />
              <option value="Patient History" />
              <option value="Property Listing" />
              <option value="Virtual Tour" />
              <option value="Price Negotiation" />
              <option value="Refund Processing" />
              <option value="FAQ" />
            </datalist>
            <div className="mt-3">
              <p className="text-xs text-voice-muted mb-2 font-medium">Suggested Capabilities:</p>
              <div className="flex flex-wrap gap-2">
                {['Appointment Booking', 'Lead Qualification', 'Customer Support', 'Order Tracking', 'Technical Support'].map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => {
                      if (!formData.capabilities.includes(cap)) {
                        setFormData({
                          ...formData,
                          capabilities: [...formData.capabilities, cap]
                        });
                      }
                    }}
                    disabled={formData.capabilities.includes(cap)}
                    className={cn(
                      "text-xs px-2 py-1.5 rounded-lg border transition-all flex items-center gap-1.5",
                      formData.capabilities.includes(cap)
                        ? "bg-voice-accent/10 border-voice-accent/20 text-voice-accent opacity-50 cursor-not-allowed"
                        : "bg-voice-bg border-voice-border text-voice-muted hover:text-voice-text hover:border-voice-accent/50 hover:bg-voice-surface"
                    )}
                  >
                    <Plus className="w-3 h-3" />
                    {cap}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-voice-muted mb-1">Triggers</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.triggers.map((trigger) => (
                <span key={trigger} className="bg-voice-surface border border-voice-border px-2 py-1 rounded-md text-xs text-voice-text flex items-center gap-1.5 group hover:border-voice-accent/50 transition-colors">
                  {trigger}
                  <button 
                    type="button"
                    onClick={() => removeTrigger(trigger)}
                    className="text-voice-muted hover:text-voice-accent transition-colors opacity-60 group-hover:opacity-100"
                    title="Remove trigger"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              className="w-full bg-voice-bg border border-voice-border rounded-xl px-4 py-2 text-voice-text focus:outline-none focus:border-voice-accent shadow-sm"
              value={newTrigger}
              onChange={e => setNewTrigger(e.target.value)}
              onKeyDown={handleAddTrigger}
              placeholder="Type trigger and press Enter (e.g., 'When user asks for pricing')..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-voice-muted mb-1">Custom Greeting</label>
            <textarea
              className="w-full bg-voice-bg border border-voice-border rounded-xl px-4 py-2 text-voice-text focus:outline-none focus:border-voice-accent shadow-sm min-h-[80px]"
              value={formData.greeting}
              onChange={e => setFormData({...formData, greeting: e.target.value})}
              placeholder="Enter a custom greeting for this agent..."
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setErrors({});
                onClose();
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-voice-muted hover:text-voice-text hover:bg-voice-border/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-voice-accent hover:bg-voice-accent-hover text-voice-on-accent px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-voice-accent/20"
            >
              {initialData ? 'Save Changes' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DashboardView = ({ onCreateAgent }: { onCreateAgent: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!containerRef.current) return;
    const els = containerRef.current.querySelectorAll<HTMLElement>(':scope > *');
    if (!els.length) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    gsap.fromTo(
      els,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        ease: 'power3.out',
        stagger: 0.05,
        clearProps: 'opacity,transform',
      },
    );
  }, []);

  /* ── Chart datasets (mocked) ─────────────────────────────────── */
  const initiationData = [
    { m: 'Jan', conv: 240, total: 410 },
    { m: 'Feb', conv: 280, total: 380 },
    { m: 'Mar', conv: 220, total: 360 },
    { m: 'Apr', conv: 310, total: 400 },
    { m: 'May', conv: 200, total: 360 },
    { m: 'Jun', conv: 330, total: 410 },
    { m: 'Jul', conv: 270, total: 380 },
    { m: 'Aug', conv: 240, total: 350 },
    { m: 'Sep', conv: 290, total: 380 },
    { m: 'Oct', conv: 250, total: 380 },
    { m: 'Nov', conv: 270, total: 380 },
    { m: 'Dec', conv: 320, total: 410 },
  ];

  const sentimentData = [
    { name: 'Positive', value: 28, color: 'var(--d-accent)' },
    { name: 'Neutral',  value: 51, color: '#6e7eff' },
    { name: 'Negative', value: 21, color: 'var(--d-border-3)' },
  ];

  const resolutionData = [
    { name: 'Resolved',     value: 87, color: 'var(--d-accent)' },
    { name: 'Unresolved',   value: 13, color: 'var(--d-card-2)' },
  ];

  const uniqueData = Array.from({ length: 12 }, (_, i) => ({
    m: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
    unique: [180, 200, 220, 260, 280, 240, 380, 260, 240, 250, 220, 240][i],
    total: [200, 240, 280, 300, 320, 290, 420, 300, 290, 290, 260, 280][i],
  }));

  const messagesData = Array.from({ length: 12 }, (_, i) => ({
    m: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
    msgs: [70, 90, 110, 130, 150, 145, 155, 130, 145, 158, 162, 150][i],
  }));

  /* Recharts tooltip — themed */
  const tooltipStyle = {
    background: 'var(--d-card)',
    border: '1px solid var(--d-border-2)',
    borderRadius: 8,
    color: 'var(--d-text)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    padding: '6px 10px',
  } as const;

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">// overview · last 24 hours</p>
          <h1 className="vfy-page-title">Dashboard</h1>
        </div>
        <div className="vfy-page-actions">
          <button type="button" className="vfy-btn vfy-btn-ghost">
            <Filter size={14} />
            Filter
          </button>
        </div>
      </div>

      {/* Row 1 — KPI strip with mixed treatments */}
      <div className="vfy-stats-grid">
        <StatCard
          variant="trend"
          label="Start date"
          value="11/09/2025"
          icon={CalendarDays}
          sub="Plan started this month"
        />
        <StatCard
          variant="meter"
          label="Package consumption"
          value="1,200"
          total="10,000"
          percent={12}
          icon={Headphones}
        />
        <StatCard
          variant="trend"
          label="Avg. calls / day"
          value="135"
          trend={-3.4}
          icon={MessageSquare}
          sub="vs. last month"
        />
        <StatCard
          variant="cta"
          label="Package remaining"
          value="25 days"
          icon={Hourglass}
          cta="Upgrade"
          onCtaClick={() => navigate('/pricing')}
          sub="Based on avg consumption per day"
        />
      </div>

      {/* Row 2 — three charts (bar / pie / donut) */}
      <div className="vfy-grid-charts-3">
        {/* Bar chart */}
        <div className="vfy-chart-card">
          <div className="vfy-chart-card-head">
            <h3 className="vfy-chart-card-title">Call initiation rate</h3>
            <span className="vfy-chart-card-trend">
              <TrendingUp size={11} />
              +2.4% last month
            </span>
          </div>
          <div className="vfy-chart-card-body" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={initiationData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--d-border)" vertical={false} />
                <XAxis dataKey="m" stroke="var(--d-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--d-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,217,146,0.05)' }} />
                <Bar dataKey="total" fill="var(--d-card-2)" radius={[3, 3, 0, 0]} barSize={10} />
                <Bar dataKey="conv"  fill="var(--d-accent)" radius={[3, 3, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="vfy-chart-card-foot">
            <span className="vfy-legend"><span className="vfy-legend-dot" style={{ background: 'var(--d-accent)' }} /> Converted</span>
            <span className="vfy-legend"><span className="vfy-legend-dot" style={{ background: 'var(--d-card-2)' }} /> Total visitors</span>
          </div>
        </div>

        {/* Pie chart — Sentiment */}
        <div className="vfy-chart-card">
          <div className="vfy-chart-card-head">
            <h3 className="vfy-chart-card-title">Sentiment distribution</h3>
          </div>
          <div className="vfy-chart-card-body" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  outerRadius="85%"
                  dataKey="value"
                  stroke="var(--d-card)"
                  strokeWidth={2}
                  paddingAngle={2}
                >
                  {sentimentData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="vfy-chart-card-foot">
            {sentimentData.map(s => (
              <span key={s.name} className="vfy-legend">
                <span className="vfy-legend-dot" style={{ background: s.color }} />
                {s.name} <span style={{ color: 'var(--d-text-2)', marginLeft: 4 }}>{s.value}%</span>
              </span>
            ))}
          </div>
        </div>

        {/* Donut chart — Resolution */}
        <div className="vfy-chart-card">
          <div className="vfy-chart-card-head">
            <h3 className="vfy-chart-card-title">Resolution rate</h3>
            <span className="vfy-chart-card-trend">
              <TrendingUp size={11} />
              +2.4% last month
            </span>
          </div>
          <div className="vfy-chart-card-body" style={{ height: 240, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resolutionData}
                  cx="50%"
                  cy="50%"
                  innerRadius="62%"
                  outerRadius="85%"
                  dataKey="value"
                  stroke="var(--d-card)"
                  strokeWidth={2}
                  startAngle={90}
                  endAngle={-270}
                >
                  {resolutionData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="vfy-donut-center">
              <span className="vfy-donut-value">87%</span>
              <span className="vfy-donut-label">resolved</span>
            </div>
          </div>
          <div className="vfy-chart-card-foot">
            <span className="vfy-legend"><span className="vfy-legend-dot" style={{ background: 'var(--d-accent)' }} /> Resolved</span>
            <span className="vfy-legend"><span className="vfy-legend-dot" style={{ background: 'var(--d-card-2)' }} /> Unresolved</span>
          </div>
        </div>
      </div>

      {/* Row 3 — two line charts */}
      <div className="vfy-grid-charts-2">
        <div className="vfy-chart-card">
          <div className="vfy-chart-card-head">
            <h3 className="vfy-chart-card-title">Unique conversations over time</h3>
            <span className="vfy-chart-card-trend">
              <TrendingUp size={11} />
              +2.4% last month
            </span>
          </div>
          <div className="vfy-chart-card-body" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={uniqueData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="grad-unique" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="var(--d-accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--d-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--d-border)" vertical={false} />
                <XAxis dataKey="m" stroke="var(--d-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--d-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'var(--d-accent)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="total"  stroke="var(--d-border-3)" strokeWidth={1.5} fill="transparent" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="unique" stroke="var(--d-accent)"   strokeWidth={2}   fill="url(#grad-unique)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="vfy-chart-card-foot">
            <span className="vfy-legend"><span className="vfy-legend-dot" style={{ background: 'var(--d-accent)' }} /> Unique users</span>
            <span className="vfy-legend"><span className="vfy-legend-dot" style={{ background: 'var(--d-border-3)' }} /> Total conversations</span>
          </div>
        </div>

        <div className="vfy-chart-card">
          <div className="vfy-chart-card-head">
            <h3 className="vfy-chart-card-title">Avg. messages per conversation</h3>
            <span className="vfy-chart-card-trend">
              <TrendingUp size={11} />
              +2.4% last month
            </span>
          </div>
          <div className="vfy-chart-card-body" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={messagesData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--d-border)" vertical={false} />
                <XAxis dataKey="m" stroke="var(--d-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--d-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'var(--d-accent)', strokeWidth: 1 }} />
                <Line
                  type="monotone"
                  dataKey="msgs"
                  stroke="var(--d-accent)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--d-accent)', stroke: 'var(--d-card)', strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="vfy-chart-card-foot">
            <span className="vfy-legend"><span className="vfy-legend-dot" style={{ background: 'var(--d-accent)' }} /> Messages</span>
          </div>
        </div>
      </div>

      {/* Row 4 — recent activity (kept) */}
      <div className="vfy-panel">
        <div className="vfy-panel-head">
          <h3 className="vfy-panel-title">
            <Activity size={14} />
            Recent activity
          </h3>
          <Link to="/dashboard/analytics" className="vfy-panel-link">
            View all <ChevronRight size={11} />
          </Link>
        </div>
        <div className="vfy-panel-body">
          {[
            { initials: 'DS', name: 'Dr. Sarah',       sub: 'Healthcare · +92 300 1234567', when: '2m ago',  duration: '3:24', status: 'success' as const, label: 'Completed' },
            { initials: 'RP', name: 'Real Estate Pro', sub: 'Real Estate · +1 415 555 0192', when: '14m ago', duration: '1:48', status: 'success' as const, label: 'Completed' },
            { initials: 'SB', name: 'Support Bot',     sub: 'Support · +44 20 7946 0958',    when: '32m ago', duration: '5:12', status: 'warn'    as const, label: 'Escalated' },
            { initials: 'DS', name: 'Dr. Sarah',       sub: 'Healthcare · +92 300 1234567',  when: '1h ago',  duration: '2:54', status: 'success' as const, label: 'Completed' },
          ].map((call, idx) => (
            <div key={idx} className="vfy-row">
              <span className="vfy-row-avatar">{call.initials}</span>
              <div className="vfy-row-meta">
                <p className="vfy-row-name">{call.name}</p>
                <p className="vfy-row-sub">{call.sub} · {call.when}</p>
              </div>
              <span className="vfy-row-duration">{call.duration}</span>
              <span className={`vfy-pill vfy-pill-${call.status === 'success' ? 'success' : 'warn'}`}>
                {call.label}
              </span>
              <button type="button" className="vfy-row-action" aria-label="Play recording">
                <Play size={12} fill="currentColor" />
              </button>
            </div>
          ))}
        </div>
        <div className="vfy-panel-foot">
          Showing <span style={{ color: 'var(--d-text)' }}>4</span> of <span style={{ color: 'var(--d-text)' }}>1,248</span> · Last sync 12s ago
        </div>
      </div>
    </div>
  );
};

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
  const [activeAgentId, setActiveAgentId] = useState<number>(location.state?.agentId || agents[0]?.id || 1);
  const activeAgent = agents.find(a => a.id === activeAgentId) || agents[0];

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
  } = useVoiceAgentFromRecord(activeAgent);

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
            <select value={activeAgentId} onChange={(e) => handleAgentSwitch(Number(e.target.value))}>
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
                onClick={toggleRecording}
                disabled={status === 'connecting'}
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:scale-100",
                  isActive 
                    ? "bg-voice-danger hover:bg-voice-danger-hover shadow-lg text-voice-on-accent" 
                    : "bg-voice-accent hover:bg-voice-accent-hover shadow-voice-accent/30 text-voice-on-accent"
                )}
              >
                {isActive ? (
                  <Phone className="w-8 h-8 fill-current rotate-[135deg]" />
                ) : (
                  <Mic className="w-8 h-8 fill-current" />
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


const SettingsView = () => {
  const [billing, setBilling] = useState<{
    creditBalanceCents: number;
    billing?: {
      mode: string;
      stripeEnabled: boolean;
      topupAvailable: boolean;
      message: string;
    };
  } | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const orgId = getActiveOrgId();

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiJson<NonNullable<typeof billing>>(
          `/api/orgs/${orgId}/billing`,
        );
        if (!cancelled) setBilling(data);
      } catch (err) {
        if (!cancelled) {
          setBillingError(
            err instanceof Error ? err.message : 'Unable to load billing',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const topUp = async () => {
    if (!orgId || !billing?.billing?.topupAvailable) return;
    setBillingBusy(true);
    setBillingError(null);
    try {
      const result = await apiJson<{
        creditBalanceCents: number;
        mode: string;
      }>(`/api/orgs/${orgId}/billing/topup`, {
        method: 'POST',
        body: JSON.stringify({ amountCents: 2500 }),
      });
      setBilling((prev) =>
        prev
          ? {
              ...prev,
              creditBalanceCents: result.creditBalanceCents,
            }
          : prev,
      );
    } catch (err) {
      setBillingError(
        err instanceof Error ? err.message : 'Top-up failed',
      );
    } finally {
      setBillingBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">// settings · workspace</p>
          <h1 className="vfy-page-title">Settings</h1>
          <p className="vfy-page-sub">
            Voice pipeline keys stay on the server. Manage credits without Stripe when it is not configured.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-voice-surface border border-voice-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-voice-text mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-voice-accent" />
            Credits &amp; billing
          </h3>
          {!orgId && (
            <p className="text-sm text-voice-muted">Select or create a workspace first.</p>
          )}
          {billingError && (
            <p className="text-sm text-red-500 mb-3" role="alert">{billingError}</p>
          )}
          {billing && (
            <>
              <p className="text-3xl font-bold text-voice-text mb-1">
                ${(billing.creditBalanceCents / 100).toFixed(2)}
              </p>
              <p className="text-sm text-voice-muted mb-4">
                {billing.billing?.message ?? 'Credit wallet'}
                {billing.billing?.mode
                  ? ` · mode: ${billing.billing.mode}`
                  : ''}
              </p>
              <button
                type="button"
                className="vfy-btn vfy-btn-primary"
                disabled={billingBusy || !billing.billing?.topupAvailable}
                onClick={() => void topUp()}
              >
                {billingBusy ? 'Adding…' : 'Add $25 demo credits'}
              </button>
              {!billing.billing?.stripeEnabled && (
                <p className="text-xs text-voice-muted mt-3">
                  Stripe is optional and currently off. Platform admins can also grant credits from /admin.
                </p>
              )}
            </>
          )}
        </div>

        <div className="bg-voice-surface border border-voice-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-voice-text mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-voice-accent" />
            Voice Pipeline (Server-managed)
          </h3>
          <p className="text-sm text-voice-muted mb-4">
            Gemini (LLM), Groq, and ElevenLabs (TTS + Scribe STT) run on the API server.
            You never paste provider keys into the browser.
          </p>
          <div className="flex items-center gap-4 p-4 bg-voice-bg border border-voice-border rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-voice-success-bright shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-voice-text">Keys configured on server</h4>
              <p className="text-xs text-voice-muted">
                Set <code>GEMINI_API_KEY</code>, <code>GROQ_API_KEY</code>, and <code>ELEVENLABS_API_KEY</code> in <code>.env</code>.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-voice-surface border border-voice-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-voice-text mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-voice-text" />
            Tools &amp; webhooks
          </h3>
          <p className="text-sm text-voice-muted mb-4">
            HTTP tools and Automation Packs are managed via the API. Configure outbound webhooks from your org tools endpoints.
          </p>
          <div className="flex items-center gap-4 p-4 bg-voice-bg border border-voice-border rounded-xl">
            <AlertCircle className="w-5 h-5 text-voice-accent" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-voice-text">API-first integrations</h4>
              <p className="text-xs text-voice-muted">
                Use OpenAPI at <code>/api/openapi.json</code> for tools, packs, and usage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

const AnalyticsView = () => {
  // Mock Data
  const performanceTrends = [
    { date: 'Mon', 'Dr. Sarah': 85, 'Real Estate': 78, 'Support Bot': 92 },
    { date: 'Tue', 'Dr. Sarah': 88, 'Real Estate': 82, 'Support Bot': 89 },
    { date: 'Wed', 'Dr. Sarah': 92, 'Real Estate': 75, 'Support Bot': 94 },
    { date: 'Thu', 'Dr. Sarah': 90, 'Real Estate': 85, 'Support Bot': 91 },
    { date: 'Fri', 'Dr. Sarah': 95, 'Real Estate': 88, 'Support Bot': 88 },
    { date: 'Sat', 'Dr. Sarah': 89, 'Real Estate': 90, 'Support Bot': 95 },
    { date: 'Sun', 'Dr. Sarah': 91, 'Real Estate': 87, 'Support Bot': 93 },
  ];

  const languageData = [
    { name: 'English (US)', value: 45, color: 'var(--color-voice-series-1)' },
    { name: 'Urdu', value: 30, color: 'var(--color-voice-series-2)' },
    { name: 'Spanish', value: 15, color: 'var(--color-voice-series-3)' },
    { name: 'Others', value: 10, color: 'var(--color-voice-series-4)' },
  ];

  const agentSuccessRates = [
    { name: 'Dr. Sarah', rate: 94, interactions: 450 },
    { name: 'Real Estate', rate: 88, interactions: 320 },
    { name: 'Support Bot', rate: 91, interactions: 210 },
    { name: 'Sales Agent', rate: 82, interactions: 180 },
  ];

  const traces = [
    { id: 'trc_123abc', service: 'Agent Core', method: 'POST /generate', status: 200, duration: '124ms', time: '10:23:45' },
    { id: 'trc_124abd', service: 'Voice Synth', method: 'POST /tts', status: 200, duration: '340ms', time: '10:23:46' },
    { id: 'trc_125abe', service: 'Auth Service', method: 'GET /validate', status: 200, duration: '45ms', time: '10:24:01' },
    { id: 'trc_126abf', service: 'Analytics', method: 'POST /log', status: 202, duration: '12ms', time: '10:24:02' },
    { id: 'trc_127abg', service: 'Agent Core', method: 'POST /generate', status: 500, duration: '890ms', time: '10:25:15' },
  ];

  return (
    <div className="space-y-8">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">// analytics · last 7 days</p>
          <h1 className="vfy-page-title">Analytics &amp; tracing</h1>
          <p className="vfy-page-sub">Detailed insights into agent performance, traffic, and system traces.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Trends Chart */}
        <div className="lg:col-span-2 bg-voice-surface border border-voice-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-voice-text mb-6">Agent Performance Trends</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-voice-chart-grid)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--color-voice-chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-voice-chart-axis)" fontSize={12} tickLine={false} axisLine={false} domain={[60, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-voice-surface)', borderColor: 'var(--color-voice-border)', borderRadius: '12px', color: 'var(--color-voice-text)' }}
                  itemStyle={{ color: 'var(--color-voice-text)' }}
                />
                <Line type="monotone" dataKey="Dr. Sarah" stroke="var(--color-voice-series-1)" strokeWidth={3} dot={{r: 4, fill: 'var(--color-voice-series-1)'}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="Real Estate" stroke="var(--color-voice-series-3)" strokeWidth={3} dot={{r: 4, fill: 'var(--color-voice-series-3)'}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="Support Bot" stroke="var(--color-voice-warning)" strokeWidth={3} dot={{r: 4, fill: 'var(--color-voice-warning)'}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Language Distribution */}
        <div className="bg-voice-surface border border-voice-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-voice-text mb-6">Language Distribution</h3>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={languageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {languageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-voice-surface)', borderColor: 'var(--color-voice-border)', borderRadius: '12px', color: 'var(--color-voice-text)' }}
                  itemStyle={{ color: 'var(--color-voice-text)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 flex-wrap">
              {languageData.map((lang) => (
                <div key={lang.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lang.color }}></div>
                  <span className="text-xs text-voice-muted">{lang.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Success Rates Chart */}
         <div className="lg:col-span-1 bg-voice-surface border border-voice-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-voice-text mb-6">Success Rates (%)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentSuccessRates} layout="vertical" margin={{ left: 0, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-voice-chart-grid)" horizontal={false} />
                {/* Percentage labels on X axis — DM Mono per spec */}
                <XAxis
                  type="number"
                  stroke="var(--color-voice-chart-axis)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tick={{ fill: 'var(--color-voice-chart-axis)', fontSize: 12, fontFamily: "'DM Mono', monospace" }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="var(--color-voice-chart-axis)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                  tick={{ fill: 'var(--color-voice-chart-axis)', fontSize: 11, fontFamily: "'Geist', sans-serif" }}
                />
                <Tooltip 
                  cursor={{fill: 'var(--color-voice-chart-cursor)'}}
                  contentStyle={{ backgroundColor: 'var(--color-voice-surface)', borderColor: 'var(--color-voice-border)', borderRadius: '12px', color: 'var(--color-voice-text)' }}
                  itemStyle={{ color: 'var(--color-voice-text)' }}
                />
                <Bar dataKey="rate" fill="var(--color-voice-series-1)" radius={[0, 4, 4, 0]} barSize={24}>
                  {agentSuccessRates.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rate > 90 ? 'var(--color-voice-series-3)' : entry.rate > 80 ? 'var(--color-voice-series-1)' : 'var(--color-voice-warning)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tracing Section */}
        <div className="lg:col-span-2 bg-voice-surface border border-voice-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-voice-text flex items-center gap-2">
              <Activity className="w-5 h-5 text-voice-accent" />
              Live Traces
            </h3>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-xs font-medium bg-voice-bg text-voice-text rounded-lg border border-voice-border hover:bg-voice-border/50 transition-colors">
                Filter
              </button>
              <button className="px-3 py-1.5 text-xs font-medium bg-voice-accent text-voice-on-accent rounded-lg hover:bg-voice-accent-hover transition-colors shadow-sm shadow-voice-accent/20">
                Export Logs
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-voice-muted uppercase bg-voice-bg border-b border-voice-border">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Trace ID</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3 rounded-tr-lg">Time</th>
                </tr>
              </thead>
              <tbody>
                {traces.map((trace) => {
                  // Latency-coded duration class
                  const ms = parseInt(trace.duration);
                  const latencyClass = ms < 300 ? 'ms-fast' : ms <= 800 ? 'ms-ok' : 'ms-slow';
                  return (
                  <tr key={trace.id} className="border-b border-voice-border hover:bg-voice-bg/50 transition-colors">
                    {/* Trace ID — DM Mono 13px table-mono */}
                    <td className="px-4 py-3 table-mono" style={{ color: 'var(--accent-voice)' }}>{trace.id}</td>
                    <td className="px-4 py-3 font-medium table-cell" style={{ color: '#F0F2F5' }}>{trace.service}</td>
                    <td className="px-4 py-3 table-cell">{trace.method}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        trace.status >= 500 ? "bg-voice-danger-faint text-voice-danger" :
                        trace.status >= 400 ? "bg-voice-warning-faint text-voice-warning" :
                        "bg-voice-success-faint text-voice-success"
                      )} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
                        {trace.status}
                      </span>
                    </td>
                    {/* Duration — DM Mono, color-coded by latency */}
                    <td className={`px-4 py-3 ${latencyClass}`}>{trace.duration}</td>
                    {/* Time — DM Mono 13px */}
                    <td className="px-4 py-3 table-mono">{trace.time}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const tail = pathname.replace(/^\/dashboard\/?/, '');

  if (!tail) return [{ label: 'Dashboard' }, { label: 'Overview' }];
  if (tail.startsWith('agents/')) return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Agents', to: '/dashboard/agents' }, { label: 'Detail' }];
  if (tail === 'agents')          return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Agents' }];
  if (tail === 'sandbox')         return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Sandbox' }];
  if (tail === 'analytics')       return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Analytics' }];
  if (tail === 'settings')        return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Settings' }];
  if (tail === 'integrations')    return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Integrations' }];
  return [{ label: 'Dashboard', to: '/dashboard' }, { label: tail.charAt(0).toUpperCase() + tail.slice(1) }];
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
  const { agents, setAgents, updateAgent } = useAgentStore();
  const dashboardAgents = asDashboardAgents(agents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);
  const [taskAgent, setTaskAgent] = useState<Agent | null>(null);
  const [clonedVoices, setClonedVoices] = useState<string[]>([]);
  const [sideOpen, setSideOpen] = useState(false);

  const handleSaveAgent = (agentData: Agent) => {
    if (editingAgent) {
      setAgents(agents.map(a => a.id === agentData.id ? agentData : a));
    } else {
      setAgents([...agents, { ...agentData, tasks: agentData.tasks ?? [] }]);
    }
    setEditingAgent(null);
  };

  const handleUpdateTasks = (agentId: number, tasks: Task[]) => {
    setAgents(agents.map(a => a.id === agentId ? { ...a, tasks } : a));
    // Also update the local taskAgent state to reflect changes immediately in the modal
    if (taskAgent && taskAgent.id === agentId) {
      setTaskAgent({ ...taskAgent, tasks });
    }
  };

  const handleConfirmDelete = () => {
    if (deletingAgent) {
      setAgents(agents.filter(a => a.id !== deletingAgent.id));
      setDeletingAgent(null);
      setIsDeleteModalOpen(false);
    }
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
      onSideClose={() => setSideOpen(false)}
      onSideOpen={() => setSideOpen(true)}
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
        clonedVoices={clonedVoices}
        onVoiceCloned={voiceName => setClonedVoices(prev => [...prev, voiceName])}
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
        <Route path="settings" element={<SettingsView />} />
        <Route path="analytics" element={<AnalyticsView />} />
        <Route
          path="integrations"
          element={
            <div>
              <div className="vfy-page-head">
                <div className="vfy-page-head-titles">
                  <p className="vfy-page-eyebrow">// integrations</p>
                  <h1 className="vfy-page-title">Connect your stack</h1>
                  <p className="vfy-page-sub">Link Voiceify to Google Sheets, n8n, Slack, and your CRM.</p>
                </div>
              </div>
              <div className="vfy-panel">
                <div className="vfy-panel-body--padded" style={{ padding: 64, textAlign: 'center' }}>
                  <WebhookIcon size={36} color="var(--d-dim)" style={{ marginBottom: 12 }} />
                  <h3 style={{ fontFamily: 'var(--d-sans)', color: 'var(--d-text)', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>
                    Integrations are coming
                  </h3>
                  <p style={{ color: 'var(--d-muted)', fontSize: 13, margin: 0 }}>
                    We're rolling out webhook templates and OAuth-based connectors. Stay tuned.
                  </p>
                </div>
              </div>
            </div>
          }
        />
      </Routes>
    </DashboardChrome>
  );
}
