import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { taskService, commentService, columnService } from '../services/index'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from '../components/ui/Spinner'
import PriorityBadge from '../components/ui/PriorityBadge'
import Avatar from '../components/ui/Avatar'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const priorityOptions = ['low', 'medium', 'high', 'urgent']

export default function TaskDetail() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket, emitTyping, emitStopTyping } = useSocket()

  const [task, setTask] = useState(null)
  const [comments, setComments] = useState([])
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const typingTimerRef = useRef(null)

  const loadTask = useCallback(async () => {
    try {
      const [taskRes, commentsRes] = await Promise.all([
        taskService.getOne(taskId),
        commentService.getByTask(taskId),
      ])
      const t = taskRes.data.data.task
      setTask(t)
      setEditForm({
        title: t.title,
        description: t.description || '',
        priority: t.priority,
        dueDate: t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') : '',
        assignees: (t.assignees || []).map((a) => a._id || a),
        labels: t.labels || [],
      })
      setComments(commentsRes.data.data.comments)

      // Load columns for this project
      if (t.project?._id) {
        const colRes = await columnService.getByProject(t.project._id)
        setColumns(colRes.data.data.columns)
      }
    } catch (err) {
      toast.error('Task not found')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }, [taskId, navigate])

  useEffect(() => {
    loadTask()
  }, [loadTask])

  // Real-time socket events for this task
  useEffect(() => {
    if (!socket) return

    const handleCommentAdded = ({ comment, taskId: tId }) => {
      if (tId === taskId) {
        setComments((prev) => {
          if (prev.find((c) => c._id === comment._id)) return prev
          return [...prev, comment]
        })
      }
    }

    const handleCommentDeleted = ({ commentId }) => {
      setComments((prev) => prev.filter((c) => c._id !== commentId))
    }

    const handleTaskUpdated = ({ task: t }) => {
      if (t._id === taskId) {
        setTask(t)
      }
    }

    const handleTyping = ({ user: u, taskId: tId }) => {
      if (tId === taskId && u._id !== user._id) {
        setTypingUsers((prev) => {
          if (prev.find((tu) => tu._id === u._id)) return prev
          return [...prev, u]
        })
      }
    }

    const handleStopTyping = ({ userId, taskId: tId }) => {
      if (tId === taskId) {
        setTypingUsers((prev) => prev.filter((u) => u._id !== userId))
      }
    }

    socket.on('commentAdded', handleCommentAdded)
    socket.on('commentDeleted', handleCommentDeleted)
    socket.on('taskUpdated', handleTaskUpdated)
    socket.on('userTyping', handleTyping)
    socket.on('userStoppedTyping', handleStopTyping)

    return () => {
      socket.off('commentAdded', handleCommentAdded)
      socket.off('commentDeleted', handleCommentDeleted)
      socket.off('taskUpdated', handleTaskUpdated)
      socket.off('userTyping', handleTyping)
      socket.off('userStoppedTyping', handleStopTyping)
    }
  }, [socket, taskId, user._id])

  const handleCommentChange = (e) => {
    setCommentText(e.target.value)
    if (task?.project?._id) {
      emitTyping(task.project._id, taskId)
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => emitStopTyping(task.project._id, taskId), 2000)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    try {
      await commentService.add(taskId, { text: commentText.trim() })
      setCommentText('')
      clearTimeout(typingTimerRef.current)
      if (task?.project?._id) emitStopTyping(task.project._id, taskId)
    } catch (err) {
      toast.error('Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      await commentService.delete(commentId)
      toast.success('Comment deleted')
    } catch (err) {
      toast.error('Failed to delete comment')
    }
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const res = await taskService.update(taskId, {
        ...editForm,
        dueDate: editForm.dueDate || null,
      })
      setTask(res.data.data.task)
      setEditing(false)
      toast.success('Task updated!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this task permanently?')) return
    try {
      await taskService.delete(taskId)
      toast.success('Task deleted')
      navigate(-1)
    } catch (err) {
      toast.error('Failed to delete task')
    }
  }

  const handleMoveToColumn = async (colId) => {
    try {
      const res = await taskService.move(taskId, { columnId: colId })
      setTask(res.data.data.task)
      toast.success('Task moved!')
    } catch (err) {
      toast.error('Failed to move task')
    }
  }

  if (loading) return <PageLoader />
  if (!task) return null

  const projectMembers = task.project?.members || []

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button onClick={() => navigate('/projects')} className="hover:text-gray-300">Projects</button>
        <span>/</span>
        <button onClick={() => navigate(`/projects/${task.project?._id}`)} className="hover:text-gray-300">
          {task.project?.name}
        </button>
        <span>/</span>
        <span className="text-gray-300 truncate max-w-xs">{task.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              {editing ? (
                <input
                  className="input text-xl font-bold flex-1"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              ) : (
                <h1 className="text-xl font-bold text-white flex-1">{task.title}</h1>
              )}
              <div className="flex gap-2 flex-shrink-0">
                {editing ? (
                  <>
                    <button onClick={() => setEditing(false)} className="btn-secondary text-sm py-1.5">Cancel</button>
                    <button onClick={handleSaveEdit} disabled={saving} className="btn-primary text-sm py-1.5 flex items-center gap-1">
                      {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing(true)} className="btn-secondary text-sm py-1.5">✏️ Edit</button>
                    <button onClick={handleDelete} className="btn-danger text-sm py-1.5">🗑️</button>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-400 mb-2">Description</p>
              {editing ? (
                <textarea
                  className="input resize-none"
                  rows={5}
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Add a description..."
                />
              ) : (
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {task.description || <span className="text-gray-600 italic">No description provided</span>}
                </p>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
              💬 Comments
              <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{comments.length}</span>
            </h2>

            {comments.length === 0 && (
              <p className="text-gray-600 text-sm text-center py-4">No comments yet. Be the first!</p>
            )}

            <div className="space-y-4 mb-5">
              {comments.map((comment) => (
                <div key={comment._id} className="flex gap-3 group">
                  <Avatar name={comment.author?.name} avatar={comment.author?.avatar} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-300">{comment.author?.name}</span>
                      <span className="text-xs text-gray-600">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="bg-gray-800/60 rounded-xl px-4 py-3">
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  </div>
                  {comment.author?._id === user._id && (
                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      className="opacity-0 group-hover:opacity-100 btn-icon text-red-400 hover:text-red-300 self-start mt-1 transition-opacity"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                {typingUsers.map((u) => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            {/* Add comment */}
            <form onSubmit={handleAddComment} className="flex gap-3">
              <Avatar name={user?.name} avatar={user?.avatar} size="sm" />
              <div className="flex-1 flex gap-2">
                <input
                  className="input flex-1 text-sm"
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={handleCommentChange}
                />
                <button type="submit" disabled={submitting || !commentText.trim()} className="btn-primary text-sm px-4 py-2">
                  {submitting ? '...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar - task metadata */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-gray-200 text-sm border-b border-gray-800 pb-3">Task Details</h3>

            {/* Priority */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Priority</p>
              {editing ? (
                <select
                  className="input text-sm py-2"
                  value={editForm.priority}
                  onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
                >
                  {priorityOptions.map((p) => (
                    <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              ) : (
                <PriorityBadge priority={task.priority} />
              )}
            </div>

            {/* Status / Column */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Column</p>
              {columns.length > 0 ? (
                <select
                  className="input text-sm py-2"
                  value={task.column?._id || task.column}
                  onChange={(e) => handleMoveToColumn(e.target.value)}
                >
                  {columns.map((col) => (
                    <option key={col._id} value={col._id}>{col.name}</option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-gray-400">{task.column?.name || 'Unknown'}</span>
              )}
            </div>

            {/* Due date */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Due Date</p>
              {editing ? (
                <input
                  type="date"
                  className="input text-sm py-2"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              ) : (
                <span className="text-sm text-gray-300">
                  {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '—'}
                </span>
              )}
            </div>

            {/* Assignees */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Assignees</p>
              {editing ? (
                <div className="space-y-2">
                  {projectMembers.map((m) => {
                    const u = m.user
                    if (!u) return null
                    const selected = editForm.assignees.includes(u._id)
                    return (
                      <label key={u._id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            setEditForm((f) => ({
                              ...f,
                              assignees: selected
                                ? f.assignees.filter((id) => id !== u._id)
                                : [...f.assignees, u._id],
                            }))
                          }}
                          className="w-4 h-4 accent-primary-500"
                        />
                        <Avatar name={u.name} avatar={u.avatar} size="xs" />
                        <span className="text-sm text-gray-300">{u.name}</span>
                      </label>
                    )
                  })}
                </div>
              ) : task.assignees?.length > 0 ? (
                <div className="space-y-2">
                  {task.assignees.map((a) => (
                    <div key={a._id} className="flex items-center gap-2">
                      <Avatar name={a.name} avatar={a.avatar} size="xs" />
                      <span className="text-sm text-gray-300">{a.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-600">Unassigned</span>
              )}
            </div>

            {/* Created by */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Created by</p>
              <div className="flex items-center gap-2">
                <Avatar name={task.createdBy?.name} avatar={task.createdBy?.avatar} size="xs" />
                <span className="text-sm text-gray-400">{task.createdBy?.name}</span>
              </div>
            </div>

            {/* Labels */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Labels</p>
              {editing ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(editForm.labels || []).map((label, i) => (
                      <span
                        key={i}
                        className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5"
                        style={{ backgroundColor: label.color + '30', color: label.color, border: `1px solid ${label.color}40` }}
                      >
                        {label.text}
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm((f) => ({
                              ...f,
                              labels: f.labels.filter((_, idx) => idx !== i),
                            }))
                          }}
                          className="hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      id="new-detail-label-input"
                      className="input text-xs py-1 flex-1"
                      placeholder="Add tag..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = e.target.value.trim()
                          if (val) {
                            setEditForm((f) => ({
                              ...f,
                              labels: [...(f.labels || []), { text: val, color: '#6366f1' }],
                            }))
                            e.target.value = ''
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              ) : task.labels?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {task.labels.map((label, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ backgroundColor: label.color + '30', color: label.color, border: `1px solid ${label.color}40` }}
                    >
                      {label.text}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-600">No labels</span>
              )}
            </div>

            {/* Timestamps */}
            <div className="border-t border-gray-800 pt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Created</span>
                <span className="text-gray-500">{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Updated</span>
                <span className="text-gray-500">{formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
