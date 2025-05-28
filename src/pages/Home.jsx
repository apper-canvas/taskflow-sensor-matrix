import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import MainFeature from '../components/MainFeature'

function Home() {
  const { isAuthenticated } = useSelector((state) => state.user)

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MainFeature />
      </div>
    </div>
  )
}

export default Home
