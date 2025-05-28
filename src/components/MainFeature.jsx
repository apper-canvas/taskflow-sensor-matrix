import { useState, useMemo, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { format, isToday, isPast, isFuture } from 'date-fns'
import { useSelector } from 'react-redux'
import ApperIcon from './ApperIcon'
import TaskService from '../services/TaskService'
import { AuthContext } from '../App'

const MainFeature = () => {
  const [tasks, setTasks] = useState([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('dueDate')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingTask, setEditingTask] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  // Get user from Redux state
  const { user, isAuthenticated } = useSelector((state) => state.user)
  const { logout } = useContext(AuthContext)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    category: 'personal'
  })

  const categories = [
    { id: 'personal', name: 'Personal', color: 'bg-blue-500' },
    { id: 'work', name: 'Work', color: 'bg-purple-500' },
    { id: 'health', name: 'Health', color: 'bg-green-500' },
    { id: 'finance', name: 'Finance', color: 'bg-yellow-500' },
    { id: 'learning', name: 'Learning', color: 'bg-pink-500' }
  ]

  const priorities = [
    { value: 'high', label: 'High', icon: 'AlertCircle', color: 'text-red-500' },
    { value: 'medium', label: 'Medium', icon: 'Clock', color: 'text-amber-500' },
    { value: 'low', label: 'Low', icon: 'ChevronDown', color: 'text-green-500' }
  ]

  // Load tasks on component mount and when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadTasks()
    }
  }, [isAuthenticated, user]) // Only depend on authentication state

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const tasksData = await TaskService.fetchTasks()
      setTasks(tasksData || [])
    } catch (err) {
      console.error('Error loading tasks:', err)
      setError(err.message || 'Failed to load tasks')
      toast.error(err.message || 'Failed to load tasks')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('Task title is required!')
      return
    }

    try {
      setSubmitLoading(true)
      
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        dueDate: formData.dueDate,
        category: formData.category,
        completed: editingTask ? editingTask.completed : false
      }

      if (editingTask) {
        const updatedTask = await TaskService.updateTask(editingTask.Id, taskData)
        setTasks(tasks.map(task => task.Id === editingTask.Id ? updatedTask : task))
        toast.success('Task updated successfully!')
        setEditingTask(null)
      } else {
        const newTask = await TaskService.createTask(taskData)
        setTasks([newTask, ...tasks])
        toast.success('Task created successfully!')
      }

      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        category: 'personal'
      })
      setIsFormOpen(false)
    } catch (err) {
      console.error('Error saving task:', err)
      toast.error(err.message || 'Failed to save task')
    } finally {
      setSubmitLoading(false)
    }
  }

  const toggleTask = async (taskId) => {
    try {
      const task = tasks.find(t => t.Id === taskId)
      if (!task) return

      const updatedTaskData = {
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.due_date,
        category: task.category,
        completed: !task.completed
      }

      const updatedTask = await TaskService.updateTask(taskId, updatedTaskData)
      setTasks(tasks.map(t => t.Id === taskId ? updatedTask : t))
      
      toast.success(task.completed ? 'Task marked as incomplete' : 'Task completed! 🎉')
    } catch (err) {
      console.error('Error toggling task:', err)
      toast.error('Failed to update task status')
    }
  }

  const deleteTask = async (taskId) => {
    try {
      await TaskService.deleteTasks([taskId])
      setTasks(tasks.filter(task => task.Id !== taskId))
      toast.success('Task deleted successfully')
    } catch (err) {
      console.error('Error deleting task:', err)
      toast.error('Failed to delete task')
    }
  }

  const startEdit = (task) => {
    setEditingTask(task)
    setFormData({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      dueDate: task.due_date || '',
      category: task.category || 'personal'
    })
    setIsFormOpen(true)
  }

  const cancelEdit = () => {
    setEditingTask(null)
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      category: 'personal'
    })
    setIsFormOpen(false)
  }

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      const matchesSearch = (task.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                           (task.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      
      switch (filter) {
        case 'completed':
          return task.completed && matchesSearch
        case 'pending':
          return !task.completed && matchesSearch
        case 'overdue':
          return !task.completed && task.due_date && isPast(new Date(task.due_date)) && matchesSearch
        case 'today':
          return task.due_date && isToday(new Date(task.due_date)) && matchesSearch
        default:
          return matchesSearch
      }
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'title':
          return (a.title || '').localeCompare(b.title || '')
        case 'dueDate':
          if (!a.due_date && !b.due_date) return 0
          if (!a.due_date) return 1
          if (!b.due_date) return -1
          return new Date(a.due_date) - new Date(b.due_date)
        default:
          return new Date(b.created_at || b.CreatedOn) - new Date(a.created_at || a.CreatedOn)
      }
    })
  }, [tasks, filter, sortBy, searchQuery])

  const taskStats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => t.completed).length
    const pending = total - completed
    const overdue = tasks.filter(t => !t.completed && t.due_date && isPast(new Date(t.due_date))).length
    
    return { total, completed, pending, overdue }
  }, [tasks])

  const getDueDateStatus = (dueDate) => {
    if (!dueDate) return null
    const date = new Date(dueDate)
    
    if (isToday(date)) return 'today'
    if (isPast(date)) return 'overdue'
    if (isFuture(date)) return 'upcoming'
    return null
  }

  // Show authentication required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-surface-200 to-surface-300 dark:from-surface-700 dark:to-surface-600 rounded-full flex items-center justify-center">
            <ApperIcon name="Lock" className="w-8 h-8 text-surface-400 dark:text-surface-500" />
          </div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">
            Authentication Required
          </h3>
          <p className="text-surface-600 dark:text-surface-400 mb-6">
            Please sign in to access your tasks
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* User Info */}
      {user && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="neu-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
                Welcome back, {user.firstName || user.emailAddress}!
              </h2>
              <p className="text-surface-600 dark:text-surface-400">
                Manage your tasks and stay organized
              </p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-surface-600 dark:text-surface-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <ApperIcon name="LogOut" className="w-4 h-4" />
              Logout
            </button>
          </div>
        </motion.div>
      )}

      {/* Header Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {[
          { label: 'Total Tasks', value: taskStats.total, icon: 'List', color: 'from-blue-500 to-blue-600' },
          { label: 'Completed', value: taskStats.completed, icon: 'CheckCircle', color: 'from-green-500 to-green-600' },
          { label: 'Pending', value: taskStats.pending, icon: 'Clock', color: 'from-amber-500 to-amber-600' },
          { label: 'Overdue', value: taskStats.overdue, icon: 'AlertTriangle', color: 'from-red-500 to-red-600' }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="neu-card p-4 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-600 dark:text-surface-400">
                  {stat.label}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100">
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <ApperIcon name={stat.icon} className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="neu-card p-4 sm:p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-100">
            Task Management
          </h2>
          
          <button
            onClick={() => setIsFormOpen(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ApperIcon name="Plus" className="w-4 h-4" />
            Add Task
          </button>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <ApperIcon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
          >
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due Today</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
          >
            <option value="dueDate">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="title">Sort by Title</option>
            <option value="created">Sort by Created</option>
          </select>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end">
          <button
            onClick={loadTasks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 neu-button text-surface-600 dark:text-surface-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ApperIcon name={loading ? "Loader" : "RefreshCw"} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="neu-card p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20"
        >
          <div className="flex items-center gap-3">
            <ApperIcon name="AlertCircle" className="w-5 h-5 text-red-500" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={loadTasks}
              className="ml-auto px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </motion.div>
      )}

      {/* Task Creation Form */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="neu-card p-4 sm:p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h3>
              <button
                onClick={cancelEdit}
                disabled={submitLoading}
                className="p-2 text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300 transition-colors disabled:opacity-50"
              >
                <ApperIcon name="X" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
                    placeholder="Enter task title..."
                    required
                    disabled={submitLoading}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
                    placeholder="Add task description..."
                    disabled={submitLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
                    disabled={submitLoading}
                  >
                    {priorities.map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
                    disabled={submitLoading}
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
                    disabled={submitLoading}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitLoading || !formData.title.trim()}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {submitLoading ? (
                    <ApperIcon name="Loader" className="w-4 h-4 animate-spin" />
                  ) : (
                    <ApperIcon name={editingTask ? "Save" : "Plus"} className="w-4 h-4" />
                  )}
                  {submitLoading ? 'Saving...' : (editingTask ? 'Update Task' : 'Create Task')}
                </button>
                
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={submitLoading}
                  className="neu-button text-surface-600 dark:text-surface-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="neu-card p-8 sm:p-12 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-surface-600 dark:text-surface-400">Loading your tasks...</p>
        </motion.div>
      )}

      {/* Task List */}
      {!loading && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-3"
        >
          <AnimatePresence>
            {filteredAndSortedTasks.length > 0 ? (
              filteredAndSortedTasks.map((task) => {
                const category = categories.find(c => c.id === task.category)
                const priority = priorities.find(p => p.value === task.priority)
                const dueDateStatus = getDueDateStatus(task.due_date)
                
                return (
                  <motion.div
                    key={task.Id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className={`neu-card p-4 sm:p-6 ${task.completed ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleTask(task.Id)}
                        className="mt-1 flex-shrink-0"
                      >
                        <div className={`task-checkbox ${task.completed ? 'checked' : ''}`} />
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                          <h4 className={`text-lg font-semibold ${task.completed ? 'line-through text-surface-500' : 'text-surface-900 dark:text-surface-100'}`}>
                            {task.title}
                          </h4>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            {priority && (
                              <span className={`priority-badge priority-${task.priority}`}>
                                <ApperIcon name={priority.icon} className="w-3 h-3" />
                                {priority.label}
                              </span>
                            )}
                            
                            {category && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${category.color} text-white`}>
                                {category.name}
                              </span>
                            )}
                            
                            {task.due_date && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                dueDateStatus === 'overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                dueDateStatus === 'today' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                'bg-surface-100 text-surface-800 dark:bg-surface-700 dark:text-surface-300'
                              }`}>
                                <ApperIcon name="Calendar" className="w-3 h-3 inline mr-1" />
                                {format(new Date(task.due_date), 'MMM dd')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {task.description && (
                          <p className={`text-sm mb-3 ${task.completed ? 'line-through text-surface-400' : 'text-surface-600 dark:text-surface-400'}`}>
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-surface-400">
                            Created {format(new Date(task.created_at || task.CreatedOn), 'MMM dd, yyyy')}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEdit(task)}
                              className="p-2 text-surface-400 hover:text-primary dark:text-surface-500 dark:hover:text-primary transition-colors"
                            >
                              <ApperIcon name="Edit2" className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => deleteTask(task.Id)}
                              className="p-2 text-surface-400 hover:text-red-500 dark:text-surface-500 dark:hover:text-red-400 transition-colors"
                            >
                              <ApperIcon name="Trash2" className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="neu-card p-8 sm:p-12 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-surface-200 to-surface-300 dark:from-surface-700 dark:to-surface-600 rounded-full flex items-center justify-center">
                  <ApperIcon name="CheckSquare" className="w-8 h-8 text-surface-400 dark:text-surface-500" />
                </div>
                
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">
                  {searchQuery || filter !== 'all' ? 'No tasks found' : 'No tasks yet'}
                </h3>
                
                <p className="text-surface-600 dark:text-surface-400 mb-6">
                  {searchQuery || filter !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Create your first task to get started with organizing your life'
                  }
                </p>
                
                {!searchQuery && filter === 'all' && (
                  <button
                    onClick={() => setIsFormOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <ApperIcon name="Plus" className="w-4 h-4" />
                    Create Your First Task
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}

export default MainFeature
