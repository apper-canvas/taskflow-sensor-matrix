import React from 'react';
import * as LucideIcons from 'lucide-react';

const ApperIcon = ({ name, className = '', size = 24, ...props }) => {
  // Get the icon component from lucide-react
  const IconComponent = LucideIcons[name];
  
  if (!IconComponent) {
    // Fallback to a default icon if the requested icon doesn't exist
    const DefaultIcon = LucideIcons.HelpCircle;
    return <DefaultIcon className={className} size={size} {...props} />;
  }
  
  return <IconComponent className={className} size={size} {...props} />;
};

export default ApperIcon;