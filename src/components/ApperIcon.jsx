import * as Icons from 'lucide-react'

const ApperIcon = ({ name, className = '', ...props }) => {
  const IconComponent = Icons[name]
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lucide-react`)
    return <Icons.HelpCircle className={className} {...props} />
  }
  
  return <IconComponent className={className} {...props} />
}

export default ApperIcon