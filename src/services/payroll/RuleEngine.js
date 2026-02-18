/**
 * Payroll Rule Engine
 * Enterprise-grade formula evaluator with dependency resolution
 * 
 * Features:
 * - Safe formula evaluation (no code execution)
 * - Dependency resolution
 * - Circular dependency detection
 * - Deterministic calculations
 * - Fixed decimal precision
 * - RemainingCTC() function for auto-balancing
 */

import { Parser } from 'expr-eval';

class RuleEngine {
  constructor() {
    this.parser = new Parser();
    this.cache = new Map();
    // Precision for decimal calculations (4 decimal places)
    this.PRECISION = 10000;
  }

  /**
   * Round to 2 decimal places (for currency)
   */
  roundCurrency(value) {
    return Math.round(value * 100) / 100;
  }

  /**
   * Validate formula expression for safety
   */
  validateFormula(formula) {
    if (!formula || typeof formula !== 'string') {
      return { valid: false, error: 'Formula must be a non-empty string' };
    }

    // Block dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/i,
      /function\s*\(/i,
      /require\s*\(/i,
      /import\s+/i,
      /process\./i,
      /global\./i,
      /__/,
      /\.constructor/,
      /\.prototype/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(formula)) {
        return { valid: false, error: 'Formula contains unsafe code' };
      }
    }

    try {
      // Try to parse the formula
      this.parser.parse(formula);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Build dependency graph from components
   */
  buildDependencyGraph(components) {
    const graph = new Map();
    const componentMap = new Map();

    // Initialize graph
    components.forEach(comp => {
      componentMap.set(comp.componentCode, comp);
      const deps = this.extractDependencies(comp);
      graph.set(comp.componentCode, {
        component: comp,
        dependencies: deps,
        dependents: [],
      });
    });

    // Build reverse dependencies
    graph.forEach((node, code) => {
      node.dependencies.forEach(depCode => {
        if (graph.has(depCode)) {
          graph.get(depCode).dependents.push(code);
        }
      });
    });

    return { graph, componentMap };
  }

  /**
   * Extract dependencies from a component
   */
  extractDependencies(component) {
    const deps = component.dependsOn || [];
    
    // Also extract from formula if present
    if (component.formulaExpression) {
      const formulaDeps = this.extractDependenciesFromFormula(component.formulaExpression);
      formulaDeps.forEach(dep => {
        if (!deps.includes(dep)) {
          deps.push(dep);
        }
      });
    }
    
    return deps;
  }

  /**
   * Extract component codes from formula expression
   */
  extractDependenciesFromFormula(formula) {
    if (!formula) return [];
    
    const dependencies = [];
    // Common component codes
    const componentCodes = [
      'BASIC', 'HRA', 'GROSS', 'CTC', 'CONVEYANCE', 'MEDICAL', 
      'SPECIAL_ALLOWANCE', 'DA', 'LTA', 'FOOD', 'INTERNET', 
      'PF_EMP', 'PF_ER', 'PF_EMPLOYER', 'ESI_EMP', 'ESI_ER', 
      'ESI_EMPLOYER', 'PROFESSIONAL_TAX', 'GRATUITY', 'NET'
    ];
    
    componentCodes.forEach(code => {
      // Match whole word to avoid partial matches
      const regex = new RegExp(`\\b${code}\\b`, 'g');
      if (regex.test(formula)) {
        dependencies.push(code);
      }
    });
    
    return dependencies;
  }

  /**
   * Detect circular dependencies using DFS
   */
  detectCircularDependencies(graph) {
    const visited = new Set();
    const recStack = new Set();
    const cycles = [];

    const dfs = (nodeCode) => {
      visited.add(nodeCode);
      recStack.add(nodeCode);

      const node = graph.get(nodeCode);
      if (node) {
        for (const depCode of node.dependencies) {
          if (!visited.has(depCode)) {
            if (dfs(depCode)) {
              cycles.push([...recStack, depCode]);
              return true;
            }
          } else if (recStack.has(depCode)) {
            cycles.push([...recStack, depCode]);
            return true;
          }
        }
      }

      recStack.delete(nodeCode);
      return false;
    };

    for (const nodeCode of graph.keys()) {
      if (!visited.has(nodeCode)) {
        dfs(nodeCode);
      }
    }

    return cycles.length > 0 ? { hasCycle: true, cycles } : { hasCycle: false };
  }

  /**
   * Topological sort for correct evaluation order
   */
  topologicalSort(graph) {
    const inDegree = new Map();
    const queue = [];
    const result = [];

    // Calculate in-degrees
    graph.forEach((node, code) => {
      inDegree.set(code, node.dependencies.length);
      if (node.dependencies.length === 0) {
        queue.push(code);
      }
    });

    // Process nodes
    while (queue.length > 0) {
      const current = queue.shift();
      result.push(current);

      const node = graph.get(current);
      if (node) {
        node.dependents.forEach(depCode => {
          const degree = inDegree.get(depCode) - 1;
          inDegree.set(depCode, degree);
          if (degree === 0) {
            queue.push(depCode);
          }
        });
      }
    }

    // Check if all nodes were processed
    if (result.length !== graph.size) {
      return { valid: false, error: 'Circular dependency detected' };
    }

    return { valid: true, order: result };
  }

  /**
   * Calculate component value with fixed decimal precision
   */
  calculateComponent(component, context, allComponents) {
    const { calculationType, value, formulaExpression, componentCode } = component;

    switch (calculationType) {
      case 'fixed':
        return this.roundCurrency(parseFloat(value) || 0);

      case 'percent_of_ctc':
        return this.roundCurrency((context.ctc * parseFloat(value)) / 100);

      case 'percent_of_basic':
        const basic = context.components.BASIC || 0;
        // If HRA and location is provided, use location-specific percentage
        if (componentCode === 'HRA' && context.hraPercent) {
          return this.roundCurrency((basic * context.hraPercent) / 100);
        }
        return this.roundCurrency((basic * parseFloat(value)) / 100);

      case 'percent_of_gross':
        const gross = context.components.GROSS || 0;
        return this.roundCurrency((gross * parseFloat(value)) / 100);

      case 'formula':
        if (!formulaExpression) {
          throw new Error(`Formula expression missing for ${componentCode}`);
        }

        // Validate formula
        const validation = this.validateFormula(formulaExpression);
        if (!validation.valid) {
          throw new Error(`Invalid formula for ${componentCode}: ${validation.error}`);
        }

        // Build evaluation context
        const evalContext = {};
        Object.keys(context.components).forEach(code => {
          evalContext[code] = context.components[code];
        });
        evalContext.CTC = context.ctc;
        evalContext.MonthlyCTC = context.ctc / 12;
        evalContext.BASIC = context.components.BASIC || 0;
        evalContext.GROSS = context.components.GROSS || 0;
        evalContext.EMPLOYEE_LOCATION = context.employeeLocation || 'non-metro';
        evalContext.PF_CAP = context.pfCap || 1800;
        evalContext.ESI_THRESHOLD = context.esiThreshold || 21000;

        // Add helper functions with fixed precision
        const helpers = {
          MIN: (...args) => {
            const values = args.map(v => parseFloat(v) || 0);
            return this.roundCurrency(Math.min(...values));
          },
          MAX: (...args) => {
            const values = args.map(v => parseFloat(v) || 0);
            return this.roundCurrency(Math.max(...values));
          },
          ROUND: (val) => this.roundCurrency(Math.round(parseFloat(val) || 0)),
          FLOOR: (val) => this.roundCurrency(Math.floor(parseFloat(val) || 0)),
          CEIL: (val) => this.roundCurrency(Math.ceil(parseFloat(val) || 0)),
          ABS: (val) => this.roundCurrency(Math.abs(parseFloat(val) || 0)),
          IF: (condition, trueVal, falseVal) => {
            return condition ? (parseFloat(trueVal) || 0) : (parseFloat(falseVal) || 0);
          },
          // RemainingCTC() - calculates remaining CTC after all fixed components
          RemainingCTC: () => {
            const monthlyCtc = context.ctc / 12;
            let allocated = 0;
            
            // Sum all fixed components except the one being calculated
            allComponents.forEach(comp => {
              if (comp.componentCode === componentCode) return; // Skip self
              if (comp.componentType !== 'earning') return; // Only earnings
              
              const compValue = context.components[comp.componentCode] || 0;
              // Only count if it's not a formula or if it's already calculated
              if (comp.calculationType !== 'formula' || compValue > 0) {
                allocated += compValue;
              }
            });
            
            const remaining = monthlyCtc - allocated;
            return this.roundCurrency(Math.max(0, remaining));
          },
        };

        try {
          // Replace special functions in formula before parsing
          let processedFormula = formulaExpression;
          
          // Handle RemainingCTC() function - replace with actual calculation
          if (processedFormula.includes('RemainingCTC()')) {
            const monthlyCtc = context.ctc / 12;
            let allocated = 0;
            
            // Sum all earnings except the one being calculated
            allComponents.forEach(comp => {
              if (comp.componentCode === componentCode) return;
              if (comp.componentType !== 'earning') return;
              
              const compValue = calculatedComponents[comp.componentCode] || 0;
              if (compValue > 0) {
                allocated += compValue;
              }
            });
            
            const remaining = Math.max(0, monthlyCtc - allocated);
            processedFormula = processedFormula.replace(/RemainingCTC\(\)/g, remaining.toString());
          }
          
          // Handle STATE_TAX function (will be resolved by StateTaxService)
          if (processedFormula.includes('STATE_TAX')) {
            // This will be handled separately in the controller
            processedFormula = processedFormula.replace(/STATE_TAX\([^)]+\)/g, '0');
          }
          
          const expr = this.parser.parse(processedFormula);
          const result = expr.evaluate({ ...evalContext, ...helpers });
          return this.roundCurrency(parseFloat(result) || 0);
        } catch (error) {
          throw new Error(`Formula evaluation error for ${componentCode}: ${error.message}`);
        }

      default:
        throw new Error(`Unknown calculation type: ${calculationType}`);
    }
  }

  /**
   * Calculate all components for a template
   */
  async calculateSalary(components, ctc, options = {}) {
    const { 
      autoBalanceSpecialAllowance = true,
      includeEmployerInCTC = false,
      employeeLocation = 'non-metro', // metro or non-metro for HRA
      hraPercent = 40, // HRA percentage (40% non-metro, 50% metro)
      pfCap = 1800,
      esiThreshold = 21000,
    } = options;

    // Build dependency graph
    const { graph, componentMap } = this.buildDependencyGraph(components);

    // Detect circular dependencies
    const cycleCheck = this.detectCircularDependencies(graph);
    if (cycleCheck.hasCycle) {
      throw new Error(`Circular dependency detected: ${cycleCheck.cycles[0].join(' -> ')}`);
    }

    // Get evaluation order
    const sortResult = this.topologicalSort(graph);
    if (!sortResult.valid) {
      throw new Error(sortResult.error);
    }

    const evaluationOrder = sortResult.order;
    const calculatedComponents = {};
    const context = {
      ctc,
      monthlyCtc: ctc / 12,
      components: calculatedComponents,
      employeeLocation,
      hraPercent,
      pfCap,
      esiThreshold,
    };

    // Calculate components in order
    for (const code of evaluationOrder) {
      const component = componentMap.get(code);
      if (!component) continue;

      try {
        // Special handling for RemainingCTC() in Special Allowance
        if (code === 'SPECIAL_ALLOWANCE' && component.formulaExpression && component.formulaExpression.includes('RemainingCTC()')) {
          const monthlyCtc = ctc / 12;
          let allocated = 0;
          
          // Sum all earnings except Special Allowance
          components.forEach(comp => {
            if (comp.componentCode === 'SPECIAL_ALLOWANCE') return;
            if (comp.componentType !== 'earning') return;
            
            const compValue = calculatedComponents[comp.componentCode] || 0;
            allocated += compValue;
          });
          
          calculatedComponents[code] = this.roundCurrency(Math.max(0, monthlyCtc - allocated));
        } else {
          calculatedComponents[code] = this.calculateComponent(component, context, components);
        }
      } catch (error) {
        throw new Error(`Error calculating ${code}: ${error.message}`);
      }
    }

    // Auto-balance Special Allowance if enabled
    if (autoBalanceSpecialAllowance) {
      const specialAllowanceComp = components.find(c => 
        c.componentCode === 'SPECIAL_ALLOWANCE' || 
        c.componentName.toLowerCase().includes('special')
      );

      if (specialAllowanceComp) {
        const monthlyCtc = ctc / 12;
        const totalAllocated = Object.entries(calculatedComponents)
          .filter(([code, value]) => {
            const comp = components.find(c => c.componentCode === code);
            return comp && 
                   comp.componentType === 'earning' && 
                   comp.componentCode !== specialAllowanceComp.componentCode &&
                   comp.calculationType !== 'formula'; // Only count non-formula earnings
          })
          .reduce((sum, [code, val]) => sum + val, 0);

        // Also add formula-based earnings that are already calculated
        Object.entries(calculatedComponents).forEach(([code, value]) => {
          const comp = components.find(c => c.componentCode === code);
          if (comp && 
              comp.componentType === 'earning' && 
              comp.componentCode !== specialAllowanceComp.componentCode &&
              comp.calculationType === 'formula' &&
              code !== 'GROSS') {
            totalAllocated += value;
          }
        });

        calculatedComponents[specialAllowanceComp.componentCode] = Math.max(0, monthlyCtc - totalAllocated);
      }
    }

    // Calculate gross (sum of all earnings)
    const earnings = components
      .filter(c => c.componentType === 'earning')
      .reduce((sum, c) => sum + (calculatedComponents[c.componentCode] || 0), 0);

    calculatedComponents.GROSS = this.roundCurrency(earnings);

    // Calculate deductions
    const deductions = components
      .filter(c => c.componentType === 'deduction')
      .reduce((sum, c) => sum + (calculatedComponents[c.componentCode] || 0), 0);

    // Calculate net
    calculatedComponents.NET = this.roundCurrency(earnings - deductions);

    // Calculate employer contributions
    const employerContributions = components
      .filter(c => c.componentType === 'employer_contribution')
      .reduce((sum, c) => sum + (calculatedComponents[c.componentCode] || 0), 0);

    // Total employer cost
    // If includeEmployerInCTC is true, employer contributions are already in CTC
    // Otherwise, add them to get true cost
    const trueEmployerCost = includeEmployerInCTC 
      ? ctc 
      : ctc + (employerContributions * 12);

    calculatedComponents.TOTAL_EMPLOYER_COST = this.roundCurrency(trueEmployerCost);

    return {
      components: calculatedComponents,
      earnings: this.roundCurrency(earnings),
      deductions: this.roundCurrency(deductions),
      net: calculatedComponents.NET,
      employerContributions: this.roundCurrency(employerContributions),
      totalEmployerCost: calculatedComponents.TOTAL_EMPLOYER_COST,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default new RuleEngine();
