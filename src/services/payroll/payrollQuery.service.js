import PayrollQuery from '../../models/PayrollQuery.js';

export const raiseQuery = async (data) => {
  return PayrollQuery.create(data);
};

export const listQueries = async (businessId) => {
  return PayrollQuery.findAll({ where: { businessId } });
};

export const resolveQuery = async (id, userId, note) => {
  const query = await PayrollQuery.findByPk(id);
  if (!query) return null;

  await query.update({
    status: 'RESOLVED',
    resolvedBy: userId,
    resolvedAt: new Date(),
  });

  return query;
};
