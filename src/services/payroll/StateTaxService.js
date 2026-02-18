/**
 * State Tax Service
 * Manages state-based professional tax calculations
 * Supports dynamic tax slabs without hardcoding
 */

import StateTaxSlab from '../../models/StateTaxSlab.js';
import { sequelize } from '../../db/index.js';

class StateTaxService {
  /**
   * Get professional tax for a state and income
   */
  async getProfessionalTax(state, grossSalary, effectiveDate = new Date()) {
    if (!state || !grossSalary) {
      return 0;
    }

    const dateStr = effectiveDate.toISOString().split('T')[0];

    const { Op } = await import('sequelize');
    
    const taxSlab = await StateTaxSlab.findOne({
      where: {
        state: state,
        isActive: true,
        incomeMin: { [Op.lte]: grossSalary },
        [Op.or]: [
          { incomeMax: { [Op.gte]: grossSalary } },
          { incomeMax: null },
        ],
        effectiveFrom: { [Op.lte]: dateStr },
        [Op.or]: [
          { effectiveTo: { [Op.gte]: dateStr } },
          { effectiveTo: null },
        ],
      },
      order: [['incomeMin', 'ASC']],
    });

    return taxSlab ? parseFloat(taxSlab.taxAmount) : 0;
  }

  /**
   * Initialize default Karnataka tax slabs
   */
  async initializeKarnatakaSlabs() {
    const existing = await StateTaxSlab.findOne({
      where: { state: 'Karnataka', isActive: true },
    });

    if (existing) {
      return; // Already initialized
    }

    const slabs = [
      { incomeMin: 0, incomeMax: 11000, taxAmount: 0 },
      { incomeMin: 11001, incomeMax: 15000, taxAmount: 150 },
      { incomeMin: 15001, incomeMax: null, taxAmount: 200 },
    ];

    const today = new Date().toISOString().split('T')[0];

    for (const slab of slabs) {
      await StateTaxSlab.create({
        state: 'Karnataka',
        incomeMin: slab.incomeMin,
        incomeMax: slab.incomeMax,
        taxAmount: slab.taxAmount,
        effectiveFrom: today,
        effectiveTo: null,
        isActive: true,
      });
    }
  }

  /**
   * Get all tax slabs for a state
   */
  async getTaxSlabs(state) {
    return await StateTaxSlab.findAll({
      where: {
        state: state,
        isActive: true,
      },
      order: [['incomeMin', 'ASC']],
    });
  }

  /**
   * Create or update tax slab
   */
  async upsertTaxSlab(slabData) {
    const { id, state, incomeMin, incomeMax, taxAmount, effectiveFrom, effectiveTo } = slabData;

    if (id) {
      return await StateTaxSlab.update(
        {
          state,
          incomeMin,
          incomeMax,
          taxAmount,
          effectiveFrom,
          effectiveTo,
        },
        { where: { id } }
      );
    } else {
      return await StateTaxSlab.create({
        state,
        incomeMin,
        incomeMax,
        taxAmount,
        effectiveFrom,
        effectiveTo: effectiveTo || null,
        isActive: true,
      });
    }
  }
}

export default new StateTaxService();
