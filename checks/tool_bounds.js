module.exports = async function toolBounds(tools) {
  const violations = []
  
  for (const call of tools || []) {
    if (call.name === 'calendar.create') {
      const { start, end, title } = call.arguments || {}
      
      // Check required fields
      if (!start || !end) {
        violations.push({ 
          id: 'calendar_bounds', 
          message: 'start and end are required' 
        })
        continue
      }
      
      // Validate datetime formats
      const startDate = new Date(start)
      const endDate = new Date(end)
      
      if (isNaN(startDate.getTime())) {
        violations.push({ 
          id: 'calendar_bounds', 
          message: 'start must be a valid ISO 8601 datetime' 
        })
      }
      
      if (isNaN(endDate.getTime())) {
        violations.push({ 
          id: 'calendar_bounds', 
          message: 'end must be a valid ISO 8601 datetime' 
        })
      }
      
      // Check temporal ordering
      if (startDate >= endDate) {
        violations.push({ 
          id: 'calendar_bounds', 
          message: 'start must be before end' 
        })
      }
      
      // Validate title
      if (!title || typeof title !== 'string') {
        violations.push({ 
          id: 'calendar_bounds', 
          message: 'title is required and must be a string' 
        })
      } else if (title.length < 3) {
        violations.push({ 
          id: 'calendar_bounds', 
          message: 'title must be at least 3 characters' 
        })
      }
    }
  }
  
  return violations
}
