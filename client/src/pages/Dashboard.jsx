import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { taskService, projectService } from '../services/index'
import { PageLoader, SkeletonCard, EmptyState } from '../components/ui/Spinner'
import PriorityBadge from '../components/ui/PriorityBadge'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const StatCard = ({ icon, label, value, color, subtitle }) => (
  <div className="card p-5 relative overflow-hidden group hover:border-gray-700 transition-all duration-200">
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 ${color}`} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
      </div>
      <span className="text-2xl">{icon}</span>
    </div>
  </div>
)

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [projectForm, setProjectForm] = useState({ name: '', description: '', color: '#6366f1', icon: '📋' })
  const [creating, setCreating] = useState(false)

  const projectColors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#10b981', '#3b82f6']
  const projectIcons = ['📋', '🚀', '💡', '🎯', '🔥', '⚡', '🌟', '🎨', '💼', '🛠️']

  useEffect(() => {
    const load = async () => {
      try {
        const res = await taskService.getDashboard()
        setStats(res.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!projectForm.name.trim()) return toast.error('Project name required')
    setCreating(true)
    try {
      const res = await projectService.create(projectForm)
      const project = res.data.data.project
      toast.success('Project created! 🎉')
      setShowCreateProject(false)
      setProjectForm({ name: '', description: '', color: '#6366f1', icon: '📋' })
      navigate(`/projects/${project._id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <PageLoader />

  const statCards = [
    { icon: '📁', label: 'Total Projects', value: stats?.totalProjects || 0, color: 'bg-primary-500' },
    { icon: '⚡', label: 'Active Tasks', value: stats?.activeTasks || 0, color: 'bg-blue-500' },
    { icon: '✅', label: 'Completed', value: stats?.completedTasks || 0, color: 'bg-emerald-500' },
    { icon: '⏰', label: 'Overdue', value: stats?.overdueTasks || 0, color: 'bg-red-500', subtitle: stats?.overdueTasks > 0 ? 'Needs attention!' : 'All on track' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your projects</p>
        </div>
        <button onClick={() => setShowCreateProject(true)} className="btn-primary flex items-center gap-2">
          <span>+</span> New Project
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-200">Recent Activity</h2>
          </div>
          {!stats?.recentTasks?.length ? (
            <EmptyState icon="📝" title="No tasks yet" description="Create your first project and start adding tasks" />
          ) : (
            <div className="space-y-3">
              {stats.recentTasks.map((task) => (
                <div
                  key={task._id}
                  className="card p-4 flex items-center gap-4 hover:border-gray-700 transition-all cursor-pointer group"
                  onClick={() => navigate(`/tasks/${task._id}`)}
                >
                  <div className={`w-1 h-12 rounded-full flex-shrink-0 ${
                    task.priority === 'urgent' ? 'bg-red-500' :
                    task.priority === 'high' ? 'bg-orange-500' :
                    task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-200 group-hover:text-white truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{task.project?.name}</span>
                      <span className="text-gray-700">·</span>
                      <span className="text-xs text-gray-600">
                        {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-200">My Projects</h2>
            <Link to="/projects" className="text-primary-400 hover:text-primary-300 text-sm">View all →</Link>
          </div>
          {!stats?.projects?.length ? (
            <div className="card p-6 text-center">
              <p className="text-gray-500 text-sm mb-3">No projects yet</p>
              <button onClick={() => setShowCreateProject(true)} className="btn-primary text-sm">
                Create Project
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.projects.slice(0, 5).map((project) => (
                <Link
                  key={project._id}
                  to={`/projects/${project._id}`}
                  className="card-hover p-4 flex items-center gap-3 block"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: project.color + '20', border: `1px solid ${project.color}40` }}
                  >
                    {project.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-200 truncate text-sm">{project.name}</p>
                    <p className="text-xs text-gray-500">{project.members?.length} member{project.members?.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex -space-x-1.5">
                    {project.members?.slice(0, 3).map((m) => (
                      <Avatar key={m.user?._id} name={m.user?.name} avatar={m.user?.avatar} size="xs" />
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      <Modal isOpen={showCreateProject} onClose={() => setShowCreateProject(false)} title="Create New Project">
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Project Name *</label>
            <input
              className="input"
              placeholder="My Awesome Project"
              value={projectForm.name}
              onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="What's this project about?"
              value={projectForm.description}
              onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {projectIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setProjectForm((f) => ({ ...f, icon }))}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    projectForm.icon === icon ? 'bg-primary-600/30 ring-2 ring-primary-500' : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {projectColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setProjectForm((f) => ({ ...f, color }))}
                  className={`w-8 h-8 rounded-full transition-all ${
                    projectForm.color === color ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateProject(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {creating && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
