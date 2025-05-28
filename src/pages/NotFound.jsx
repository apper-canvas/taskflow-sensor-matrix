import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ApperIcon from '../components/ApperIcon';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 via-primary/5 to-secondary/5 dark:from-surface-900 dark:via-surface-800 dark:to-surface-900">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center px-4"
      >
        <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-surface-200 to-surface-300 dark:from-surface-700 dark:to-surface-600 rounded-full flex items-center justify-center">
          <ApperIcon name="Search" className="w-12 h-12 text-surface-400 dark:text-surface-500" />
        </div>
        
        <h1 className="text-6xl font-bold text-surface-800 dark:text-surface-100 mb-4">404</h1>
        
        <h2 className="text-2xl font-semibold text-surface-700 dark:text-surface-200 mb-4">
          Page Not Found
        </h2>
        
        <p className="text-surface-600 dark:text-surface-400 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        
        <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ApperIcon name="Home" className="w-4 h-4" />
            Go Home
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-300 dark:border-surface-600 rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ApperIcon name="ArrowLeft" className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;