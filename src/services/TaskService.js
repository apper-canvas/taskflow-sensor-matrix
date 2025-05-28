class TaskService {
  constructor() {
    const { ApperClient } = window.ApperSDK;
    this.apperClient = new ApperClient({
      apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
      apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
    });
    this.tableName = 'task1';
    
    // Define updateable fields based on the provided schema
    this.updateableFields = [
      'Name',
      'Tags', 
      'Owner',
      'title',
      'description',
      'priority',
      'due_date',
      'category',
      'completed',
      'created_at',
      'updated_at'
    ];
    
    // All fields for fetching (including system fields)
    this.allFields = [
      'Id',
      'Name',
      'Tags',
      'Owner',
      'CreatedOn',
      'CreatedBy', 
      'ModifiedOn',
      'ModifiedBy',
      'title',
      'description',
      'priority',
      'due_date',
      'category',
      'completed',
      'created_at',
      'updated_at'
    ];
  }

  // Fetch all tasks with optional filtering and sorting
  async fetchTasks(params = {}) {
    try {
      const queryParams = {
        fields: this.allFields,
        ...(params.where && { where: params.where }),
        ...(params.orderBy && { orderBy: params.orderBy }),
        ...(params.pagingInfo && { pagingInfo: params.pagingInfo })
      };

      const response = await this.apperClient.fetchRecords(this.tableName, queryParams);
      
      if (!response || !response.data) {
        return [];
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw new Error('Failed to fetch tasks. Please try again.');
    }
  }

  // Fetch a single task by ID
  async getTaskById(taskId) {
    try {
      const params = {
        fields: this.allFields
      };

      const response = await this.apperClient.getRecordById(this.tableName, taskId, params);
      
      if (!response || !response.data) {
        return null;
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching task with ID ${taskId}:`, error);
      throw new Error('Failed to fetch task. Please try again.');
    }
  }

  // Create a new task
  async createTask(taskData) {
    try {
      // Format data according to field types and filter only updateable fields
      const formattedData = this.formatTaskData(taskData, 'create');
      
      const params = {
        records: [formattedData] // Always an array
      };

      const response = await this.apperClient.createRecord(this.tableName, params);
      
      if (response && response.success && response.results && response.results.length > 0) {
        const result = response.results[0];
        if (result.success) {
          return result.data;
        } else {
          // Handle field-specific errors
          if (result.errors && result.errors.length > 0) {
            const errorMessages = result.errors.map(error => 
              `${error.fieldLabel}: ${error.message}`
            ).join(', ');
            throw new Error(errorMessages);
          } else {
            throw new Error(result.message || 'Failed to create task');
          }
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Update an existing task
  async updateTask(taskId, taskData) {
    try {
      // Format data and include ID for update
      const formattedData = this.formatTaskData(taskData, 'update');
      formattedData.Id = taskId;
      
      const params = {
        records: [formattedData] // Always an array
      };

      const response = await this.apperClient.updateRecord(this.tableName, params);
      
      if (response && response.success && response.results && response.results.length > 0) {
        const result = response.results[0];
        if (result.success) {
          return result.data;
        } else {
          throw new Error(result.message || 'Failed to update task');
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Delete tasks
  async deleteTasks(taskIds) {
    try {
      const params = {
        RecordIds: Array.isArray(taskIds) ? taskIds : [taskIds]
      };

      const response = await this.apperClient.deleteRecord(this.tableName, params);
      
      if (response && response.success) {
        return true;
      } else {
        throw new Error('Failed to delete tasks');
      }
    } catch (error) {
      console.error('Error deleting tasks:', error);
      throw error;
    }
  }

  // Search tasks by title or description
  async searchTasks(searchQuery, additionalFilters = {}) {
    try {
      const whereConditions = [];
      
      if (searchQuery && searchQuery.trim()) {
        whereConditions.push(
          {
            fieldName: 'title',
            operator: 'Contains',
            values: [searchQuery.trim()]
          },
          {
            fieldName: 'description', 
            operator: 'Contains',
            values: [searchQuery.trim()]
          }
        );
      }

      // Add additional filters
      if (additionalFilters.priority) {
        whereConditions.push({
          fieldName: 'priority',
          operator: 'ExactMatch',
          values: [additionalFilters.priority]
        });
      }

      if (additionalFilters.category) {
        whereConditions.push({
          fieldName: 'category',
          operator: 'ExactMatch', 
          values: [additionalFilters.category]
        });
      }

      if (additionalFilters.completed !== undefined) {
        whereConditions.push({
          fieldName: 'completed',
          operator: 'ExactMatch',
          values: [additionalFilters.completed ? 'true' : 'false']
        });
      }

      const params = {
        fields: this.allFields,
        orderBy: [{
          fieldName: 'created_at',
          SortType: 'DESC'
        }]
      };

      if (whereConditions.length > 0) {
        if (searchQuery && searchQuery.trim() && whereConditions.length > 2) {
          // Use whereGroups for OR condition between title and description
          params.whereGroups = [{
            operator: 'OR',
            subGroups: [
              {
                conditions: [whereConditions[0]], // title condition
                operator: ''
              },
              {
                conditions: [whereConditions[1]], // description condition  
                operator: ''
              }
            ]
          }];
          
          // Add other filters as regular where conditions
          if (whereConditions.length > 2) {
            params.where = whereConditions.slice(2);
          }
        } else {
          params.where = whereConditions;
        }
      }

      return await this.fetchTasks(params);
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw error;
    }
  }

  // Format task data according to field types
  formatTaskData(data, operation = 'create') {
    const formatted = {};
    
    // Only include updateable fields
    this.updateableFields.forEach(field => {
      if (data.hasOwnProperty(field) || this.mapUIFieldToBackend(field, data)) {
        const value = this.mapUIFieldToBackend(field, data) || data[field];
        if (value !== undefined && value !== null && value !== '') {
          formatted[field] = this.formatFieldValue(field, value);
        }
      }
    });

    return formatted;
  }

  // Map UI field names to backend field names and values
  mapUIFieldToBackend(backendField, uiData) {
    const fieldMapping = {
      'title': uiData.title,
      'description': uiData.description,
      'priority': uiData.priority,
      'due_date': uiData.dueDate,
      'category': uiData.category,
      'completed': uiData.completed,
      'created_at': uiData.createdAt || new Date().toISOString(),
      'updated_at': new Date().toISOString()
    };
    
    return fieldMapping[backendField];
  }

  // Format field values according to their types
  formatFieldValue(fieldName, value) {
    switch (fieldName) {
      case 'due_date':
        // Date field - format as YYYY-MM-DD
        if (value) {
          const date = new Date(value);
          return date.toISOString().split('T')[0];
        }
        return null;
        
      case 'created_at':
      case 'updated_at':
        // DateTime fields - format as ISO string
        if (value) {
          return new Date(value).toISOString();
        }
        return new Date().toISOString();
        
      case 'completed':
        // Boolean field
        return Boolean(value);
        
      case 'priority':
      case 'category':
        // Picklist fields - return as string
        return String(value);
        
      case 'Tags':
        // Tag field - comma-separated string
        if (Array.isArray(value)) {
          return value.join(',');
        }
        return String(value || '');
        
      default:
        // Text and other fields
        return String(value || '');
    }
  }

  // Get tasks with specific filters commonly used in the UI
  async getTasksByFilter(filterType, additionalParams = {}) {
    try {
      let whereConditions = [];
      
      switch (filterType) {
        case 'completed':
          whereConditions.push({
            fieldName: 'completed',
            operator: 'ExactMatch',
            values: [true]
          });
          break;
          
        case 'pending':
          whereConditions.push({
            fieldName: 'completed',
            operator: 'ExactMatch', 
            values: [false]
          });
          break;
          
        case 'overdue':
          whereConditions.push(
            {
              fieldName: 'completed',
              operator: 'ExactMatch',
              values: [false]
            },
            {
              fieldName: 'due_date',
              operator: 'LessThan',
              values: [new Date().toISOString().split('T')[0]]
            }
          );
          break;
          
        case 'today':
          whereConditions.push({
            fieldName: 'due_date',
            operator: 'ExactMatch',
            values: [new Date().toISOString().split('T')[0]]
          });
          break;
      }

      const params = {
        fields: this.allFields,
        where: whereConditions,
        orderBy: [{
          fieldName: 'due_date',
          SortType: 'ASC'
        }],
        ...additionalParams
      };

      return await this.fetchTasks(params);
    } catch (error) {
      console.error(`Error fetching ${filterType} tasks:`, error);
      throw error;
    }
  }
}

const taskService = new TaskService();
export default taskService;