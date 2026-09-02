import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { projectService, taskService, columnService } from '../services/index'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { PageLoader, EmptyState } from '../components/ui/Spinner'
import PriorityBadge from '../components/ui/PriorityBadge'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import { format, isPast, isToday } from 'date-fns'
import toast from 'react-hot-toast'

// ── Task Card ──────────────────────────────────────────────────
function TaskCard({ task, onClick, isDragging }) {
  const dueDateStr = task.dueDate ? new Date(task.dueDate) : null
  const isOverdue = dueDateStr && isPast(dueDateStr) && task.status !== 'completed'
  const isDueToday = dueDateStr && isToday(dueDateStr)

  return (
    <div
      className={`task-card ${isDragging ? 'opacity-50 shadow-2xl scale-[1.02]' : ''}`}
      onClick={() => onClick && onClick(task)}
    >
      {/* Labels */}
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((label, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: label.color + '30', color: label.color, border: `1px solid ${label.color}40` }}
            >
              {label.text}
            </span>
          ))}
        </div>
      )}

      <p className="text-sm font-medium text-gray-200 mb-2 leading-snug">{task.title}</p>

      {task.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <PriorityBadge priority={task.priority} />
        <div className="flex items-center gap-2">
          {dueDateStr && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              isOverdue ? 'bg-red-500/20 text-red-400' :
              isDueToday ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500'
            }`}>
              {isOverdue ? '⚠️' : '📅'} {format(dueDateStr, 'MMM d')}
            </span>
          )}
          {task.assignees?.length > 0 && (
            <div className="flex -space-x-1">
              {task.assignees.slice(0, 2).map((a) => (
                <Avatar key={a._id} name={a.name} avatar={a.avatar} size="xs" />
              ))}
              {task.assignees.length > 2 && (
                <span className="w-5 h-5 rounded-full bg-gray-700 text-xs flex items-center justify-center text-gray-400 ring-1 ring-gray-900">
                  +{task.assignees.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sortable Task ──────────────────────────────────────────────
function SortableTaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
    data: { type: 'task', task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} isDragging={isDragging} />
    </div>
  )
}

// ── Kanban Column ──────────────────────────────────────────────
function KanbanColumn({ column, tasks, onTaskClick, onAddTask, onDeleteColumn, onRenameColumn }) {
  const [isEditing, setIsEditing] = useState(false)
  const [newName, setNewName] = useState(column.name)
  const [showMenu, setShowMenu] = useState(false)

  const handleRename = async () => {
    if (newName.trim() && newName !== column.name) {
      await onRenameColumn(column._id, newName.trim())
    }
    setIsEditing(false)
    setShowMenu(false)
  }

  return (
    <div className="kanban-column">
      {/* Column header */}
      <div className="p-3 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color === '#e2e8f0' ? '#64748b' : column.color }} />
          {isEditing ? (
            <input
              className="text-sm font-semibold text-gray-200 bg-gray-800 border border-gray-600 rounded px-2 py-0.5 flex-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setNewName(column.name); setIsEditing(false) } }}
              autoFocus
            />
          ) : (
            <h3 className="text-sm font-semibold text-gray-200">{column.name}</h3>
          )}
          <span className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="btn-icon text-gray-500 text-sm"
          >
            ⋯
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-20 py-1 animate-scale-in">
              <button
                onClick={() => { setIsEditing(true); setShowMenu(false) }}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                ✏️ Rename
              </button>
              <button
                onClick={() => { onDeleteColumn(column._id); setShowMenu(false) }}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800"
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
        <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task._id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>
      </div>

      {/* Add task button */}
      <div className="p-2">
        <button
          onClick={() => onAddTask(column)}
          className="w-full text-left text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 px-3 py-2 rounded-xl transition-all flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Add task
        </button>
      </div>
    </div>
  )
}

// ── Create Task Modal ──────────────────────────────────────────
function CreateTaskModal({ isOpen, onClose, column, members, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assignees: [],
    labels: [],
  })
  const [newLabelText, setNewLabelText] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)

  const labelColors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#3b82f6']

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    setSaving(true)
    try {
      await onCreate({ ...form, columnId: column._id, dueDate: form.dueDate || null })
      setForm({ title: '', description: '', priority: 'medium', dueDate: '', assignees: [], labels: [] })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const toggleAssignee = (userId) => {
    setForm((f) => ({
      ...f,
      assignees: f.assignees.includes(userId)
        ? f.assignees.filter((id) => id !== userId)
        : [...f.assignees, userId],
    }))
  }

  const addLabel = () => {
    if (!newLabelText.trim()) return
    setForm((f) => ({
      ...f,
      labels: [...f.labels, { text: newLabelText.trim(), color: newLabelColor }],
    }))
    setNewLabelText('')
  }

  const removeLabel = (index) => {
    setForm((f) => ({
      ...f,
      labels: f.labels.filter((_, i) => i !== index),
    }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add task to "${column?.name}"`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Title *</label>
          <input
            className="input"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Task description..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Priority</label>
            <select
              className="input"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Due Date</label>
            <input
              type="date"
              className="input"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
        </div>

        {/* Labels / Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Labels</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.labels.map((l, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5"
                style={{ backgroundColor: l.color + '30', color: l.color, border: `1px solid ${l.color}40` }}
              >
                {l.text}
                <button type="button" onClick={() => removeLabel(i)} className="hover:text-white">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input text-xs py-1.5 flex-1"
              placeholder="New label name (e.g. Bug, Feature)"
              value={newLabelText}
              onChange={(e) => setNewLabelText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel() } }}
            />
            <div className="flex items-center gap-1">
              {labelColors.slice(0, 4).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewLabelColor(c)}
                  className={`w-5 h-5 rounded-full ${newLabelColor === c ? 'ring-2 ring-white scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button type="button" onClick={addLabel} className="btn-secondary text-xs px-2.5 py-1.5">Add</button>
          </div>
        </div>

        {members?.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Assignees</label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const u = m.user
                if (!u) return null
                const selected = form.assignees.includes(u._id)
                return (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => toggleAssignee(u._id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-sm transition-all ${
                      selected ? 'bg-primary-600/30 border border-primary-500/40 text-primary-300' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <Avatar name={u.name} avatar={u.avatar} size="xs" />
                    <span>{u.name.split(' ')[0]}</span>
                    {selected && <span className="text-primary-400">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Adding...' : 'Add Task'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main ProjectBoard ──────────────────────────────────────────
export default function ProjectBoard() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket, joinProject, leaveProject } = useSocket()

  const [project, setProject] = useState(null)
  const [columns, setColumns] = useState([])
  const [tasks, setTasks] = useState([]) // flat array
  const [loading, setLoading] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [activeTask, setActiveTask] = useState(null)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState(null)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [addMemberEmail, setAddMemberEmail] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Load project data
  const loadBoard = useCallback(async () => {
    try {
      const [projectRes, columnsRes, tasksRes] = await Promise.all([
        projectService.getOne(projectId),
        columnService.getByProject(projectId),
        taskService.getByProject(projectId),
      ])
      setProject(projectRes.data.data.project)
      setColumns(columnsRes.data.data.columns)
      setTasks(tasksRes.data.data.tasks)
    } catch (err) {
      toast.error('Failed to load project')
      navigate('/projects')
    } finally {
      setLoading(false)
    }
  }, [projectId, navigate])

  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  // Socket.io room management
  useEffect(() => {
    if (!socket || !projectId) return
    joinProject(projectId)

    socket.on('onlineUsers', ({ onlineUsers }) => setOnlineUsers(onlineUsers))
    socket.on('userJoinedProject', ({ user: u, onlineUsers }) => setOnlineUsers(onlineUsers))
    socket.on('userLeftProject', ({ userId, onlineUsers }) => setOnlineUsers(onlineUsers))

    // Real-time task events
    socket.on('taskCreated', ({ task }) => {
      if (task.project === projectId || task.project?._id === projectId) {
        setTasks((prev) => {
          if (prev.find((t) => t._id === task._id)) return prev
          return [...prev, task]
        })
        toast(`📝 New task: "${task.title}"`, { duration: 2000 })
      }
    })

    socket.on('taskUpdated', ({ task }) => {
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)))
    })

    socket.on('taskDeleted', ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId))
    })

    socket.on('taskMoved', ({ task }) => {
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)))
    })

    socket.on('columnCreated', ({ column }) => {
      setColumns((prev) => {
        if (prev.find((c) => c._id === column._id)) return prev
        return [...prev, column].sort((a, b) => a.order - b.order)
      })
    })

    socket.on('columnUpdated', ({ column }) => {
      setColumns((prev) => prev.map((c) => (c._id === column._id ? column : c)))
    })

    socket.on('columnDeleted', ({ columnId }) => {
      setColumns((prev) => prev.filter((c) => c._id !== columnId))
      setTasks((prev) => prev.filter((t) => t.column !== columnId && t.column?._id !== columnId))
    })

    socket.on('projectUpdated', ({ project }) => setProject(project))
    socket.on('memberAdded', () => loadBoard())
    socket.on('memberRemoved', () => loadBoard())

    return () => {
      leaveProject(projectId)
      socket.off('onlineUsers')
      socket.off('userJoinedProject')
      socket.off('userLeftProject')
      socket.off('taskCreated')
      socket.off('taskUpdated')
      socket.off('taskDeleted')
      socket.off('taskMoved')
      socket.off('columnCreated')
      socket.off('columnUpdated')
      socket.off('columnDeleted')
      socket.off('projectUpdated')
      socket.off('memberAdded')
      socket.off('memberRemoved')
    }
  }, [socket, projectId, joinProject, leaveProject, loadBoard])

  // Get tasks for a column (with filtering)
  const getColumnTasks = (colId) => {
    return tasks
      .filter((t) => {
        const tColId = t.column?._id || t.column
        if (tColId !== colId) return false
        if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false
        if (filterPriority && t.priority !== filterPriority) return false
        return true
      })
      .sort((a, b) => a.order - b.order)
  }

  // Drag and drop
  const handleDragStart = ({ active }) => {
    const task = tasks.find((t) => t._id === active.id)
    setActiveTask(task)
  }

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null)
    if (!over) return

    const taskId = active.id
    const overId = over.id

    // Determine which column was dropped on
    const overTask = tasks.find((t) => t._id === overId)
    const overColumn = overTask
      ? (overTask.column?._id || overTask.column)
      : columns.find((c) => c._id === overId)?._id

    if (!overColumn) return

    const task = tasks.find((t) => t._id === taskId)
    const fromColumn = task.column?._id || task.column

    // Optimistic update
    setTasks((prev) => prev.map((t) => {
      if (t._id === taskId) {
        return { ...t, column: overColumn }
      }
      return t
    }))

    try {
      await taskService.move(taskId, { columnId: overColumn, order: 0 })
    } catch (err) {
      toast.error('Failed to move task')
      loadBoard()
    }
  }

  // Create task
  const handleCreateTask = async (formData) => {
    try {
      const res = await taskService.create(projectId, formData)
      // Real-time event will update the list via socket
      toast.success('Task created!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task')
    }
  }

  // Add column
  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return
    try {
      await columnService.create(projectId, { name: newColumnName.trim() })
      setNewColumnName('')
      setShowAddColumn(false)
      toast.success('Column added')
    } catch (err) {
      toast.error('Failed to create column')
    }
  }

  // Delete column
  const handleDeleteColumn = async (colId) => {
    if (!window.confirm('Delete this column and all its tasks?')) return
    try {
      await columnService.delete(colId)
      toast.success('Column deleted')
    } catch (err) {
      toast.error('Failed to delete column')
    }
  }

  // Rename column
  const handleRenameColumn = async (colId, name) => {
    try {
      await columnService.update(colId, { name })
      toast.success('Column renamed')
    } catch (err) {
      toast.error('Failed to rename column')
    }
  }

  // Add member
  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!addMemberEmail.trim()) return
    setAddingMember(true)
    try {
      await projectService.addMember(projectId, { email: addMemberEmail.trim(), role: 'member' })
      setAddMemberEmail('')
      toast.success('Member added!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member')
    } finally {
      setAddingMember(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col h-full">
      {/* Board header */}
      <div className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center gap-4 flex-wrap">
          <button onClick={() => navigate('/projects')} className="text-gray-500 hover:text-gray-300 text-sm">← Back</button>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: project?.color + '20' }}
            >
              {project?.icon}
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-none">{project?.name}</h1>
              {project?.description && <p className="text-gray-500 text-xs mt-0.5">{project.description}</p>}
            </div>
          </div>

          <div className="flex-1" />

          {/* Search + Filter */}
          <input
            className="bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500 w-44"
            placeholder="🔍 Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-1.5 text-sm text-gray-400 focus:outline-none focus:border-primary-500"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Online users */}
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1.5">
              {onlineUsers.slice(0, 4).map((u) => (
                <Avatar key={u._id} name={u.name} avatar={u.avatar} size="xs" online />
              ))}
            </div>
            {onlineUsers.length > 0 && (
              <span className="text-xs text-green-400 ml-1">{onlineUsers.length} online</span>
            )}
          </div>

          {/* Members button */}
          <button onClick={() => setShowMembers(true)} className="btn-secondary text-sm flex items-center gap-1.5 py-1.5">
            👥 {project?.members?.length}
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-w-max">
            {columns.map((column) => (
              <KanbanColumn
                key={column._id}
                column={column}
                tasks={getColumnTasks(column._id)}
                onTaskClick={(task) => navigate(`/tasks/${task._id}`)}
                onAddTask={(col) => { setSelectedColumn(col); setShowCreateTask(true) }}
                onDeleteColumn={handleDeleteColumn}
                onRenameColumn={handleRenameColumn}
              />
            ))}

            {/* Add column */}
            <div className="flex-shrink-0 w-72">
              {showAddColumn ? (
                <div className="kanban-column p-3">
                  <input
                    className="input text-sm mb-2"
                    placeholder="Column name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddColumn(); if (e.key === 'Escape') setShowAddColumn(false) }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddColumn} className="btn-primary text-sm py-1.5 flex-1">Add</button>
                    <button onClick={() => { setShowAddColumn(false); setNewColumnName('') }} className="btn-secondary text-sm py-1.5">✕</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddColumn(true)}
                  className="w-full h-12 border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-2xl text-gray-600 hover:text-gray-400 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <span>+</span> Add Column
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} isDragging />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          isOpen={showCreateTask}
          onClose={() => setShowCreateTask(false)}
          column={selectedColumn}
          members={project?.members || []}
          onCreate={handleCreateTask}
        />
      )}

      {/* Members Modal */}
      <Modal isOpen={showMembers} onClose={() => setShowMembers(false)} title="Project Members" size="md">
        <div className="space-y-4">
          <div className="space-y-2">
            {project?.members?.map((m) => (
              <div key={m.user?._id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                <Avatar name={m.user?.name} avatar={m.user?.avatar} size="sm" online={onlineUsers.some((ou) => ou._id?.toString() === m.user?._id?.toString())} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200">{m.user?.name}</p>
                  <p className="text-xs text-gray-500">{m.user?.email}</p>
                </div>
                <span className="badge bg-gray-700/50 text-gray-400 border-gray-700 capitalize">{m.role}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddMember} className="flex gap-2 pt-2 border-t border-gray-800">
            <input
              className="input text-sm flex-1"
              placeholder="Add member by email"
              value={addMemberEmail}
              onChange={(e) => setAddMemberEmail(e.target.value)}
              type="email"
            />
            <button type="submit" disabled={addingMember} className="btn-primary text-sm px-3">
              {addingMember ? '...' : 'Add'}
            </button>
          </form>
        </div>
      </Modal>
    </div>
  )
}
