import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { projectService } from '../services/index'
import { PageLoader, EmptyState } from '../components/ui/Spinner'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1', icon: '📋' })
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')

  const projectColors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#10b981', '#3b82f6']
  const projectIcons = ['📋', '🚀', '💡', '🎯', '🔥', '⚡', '🌟', '🎨', '💼', '🛠️']

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const res = await projectService.getAll()
      setProjects(res.data.data.projects)
    } catch (err) {
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Project name required')
    setCreating(true)
    try {
      const res = await projectService.create(form)
      const project = res.data.data.project
      setProjects((prev) => [project, ...prev])
      toast.success('Project created!')
      setShowCreate(false)
      setForm({ name: '', description: '', color: '#6366f1', icon: '📋' })
      navigate(`/projects/${project._id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <PageLoader />

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-500 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <span>+</span> New Project
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          className="input max-w-sm"
          placeholder="🔍  Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!filtered.length ? (
        <EmptyState
          icon="📁"
          title={search ? 'No projects found' : 'No projects yet'}
          description={search ? 'Try a different search term' : 'Create your first project to get started'}
          action={!search && (
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              Create Project
            </button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Link
              key={project._id}
              to={`/projects/${project._id}`}
              className="card-hover p-5 flex flex-col gap-4 block"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: project.color + '20', border: `1px solid ${project.color}40` }}
                >
                  {project.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-200 truncate">{project.name}</h3>
                  <p className="text-gray-500 text-sm truncate mt-0.5">{project.description || 'No description'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex -space-x-1.5">
                  {project.members?.slice(0, 4).map((m) => (
                    <Avatar key={m.user?._id} name={m.user?.name} avatar={m.user?.avatar} size="xs" />
                  ))}
                  {project.members?.length > 4 && (
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300 ring-2 ring-gray-900">
                      +{project.members.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-600">
                  {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Name *</label>
            <input
              className="input"
              placeholder="Project name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Brief description..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {projectIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon }))}
                  className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${
                    form.icon === icon ? 'bg-primary-600/30 ring-2 ring-primary-500' : 'bg-gray-800 hover:bg-gray-700'
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
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className={`w-8 h-8 rounded-full transition-all ${
                    form.color === color ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={creating} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {creating && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
