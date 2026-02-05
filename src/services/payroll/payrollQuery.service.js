import PayrollQuery from '../../models/PayrollQuery.js';
import { Employee } from '../../models/index.js';

export const raiseQuery = async (data) => {
  return PayrollQuery.create(data);
};

export const listQueries = async (businessId, filters = {}) => {
  const whereClause = { businessId };
  
  if (filters.status) {
    whereClause.status = filters.status;
  }
  if (filters.category) {
    whereClause.category = filters.category;
  }
  
  const queries = await PayrollQuery.findAll({ 
    where: whereClause,
    include: [{
      model: Employee,
      as: 'employee',
      attributes: ['id', 'firstName', 'lastName', 'empId', 'empEmail', 'empDepartment']
    }],
    order: [['createdAt', 'DESC']]
  });
  
  return queries.map(q => ({
    id: q.id,
    category: q.category,
    subject: q.subject,
    description: q.description,
    status: q.status,
    resolutionNotes: q.resolutionNotes,
    resolvedAt: q.resolvedAt,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
    employee: q.employee ? {
      id: q.employee.id,
      name: `${q.employee.firstName} ${q.employee.lastName}`,
      employeeId: q.employee.empId,
      email: q.employee.empEmail,
      department: q.employee.empDepartment
    } : null
  }));
};

export const getQueryById = async (id, businessId) => {
  const query = await PayrollQuery.findOne({
    where: { id, businessId },
    include: [{
      model: Employee,
      as: 'employee',
      attributes: ['id', 'firstName', 'lastName', 'empId', 'empEmail', 'empDepartment']
    }]
  });
  
  if (!query) return null;
  
  return {
    id: query.id,
    category: query.category,
    subject: query.subject,
    description: query.description,
    status: query.status,
    resolutionNotes: query.resolutionNotes,
    resolvedBy: query.resolvedBy,
    resolvedAt: query.resolvedAt,
    createdAt: query.createdAt,
    updatedAt: query.updatedAt,
    employee: query.employee ? {
      id: query.employee.id,
      name: `${query.employee.firstName} ${query.employee.lastName}`,
      employeeId: query.employee.empId,
      email: query.employee.empEmail,
      department: query.employee.empDepartment
    } : null
  };
};

export const resolveQuery = async (id, userId, resolutionNotes, status = 'Resolved') => {
  const query = await PayrollQuery.findByPk(id);
  if (!query) return null;

  await query.update({
    status: status,
    resolutionNotes: resolutionNotes,
    resolvedBy: userId,
    resolvedAt: new Date(),
  });

  return query;
};

export const updateQueryStatus = async (id, status) => {
  const query = await PayrollQuery.findByPk(id);
  if (!query) return null;

  await query.update({ status });
  return query;
};

export const getQueryStats = async (businessId) => {
  const queries = await PayrollQuery.findAll({ where: { businessId } });
  
  return {
    total: queries.length,
    pending: queries.filter(q => q.status === 'Pending').length,
    inProgress: queries.filter(q => q.status === 'In Progress').length,
    resolved: queries.filter(q => q.status === 'Resolved').length,
    closed: queries.filter(q => q.status === 'Closed').length
  };
};
