import { asyncHandler } from '../../utils/asyncHandler.js';

const WORK_PAGES = {
  timesheets: {
    title: 'Timesheets',
    icon: 'fa-clock-rotate-left',
    description: 'Log your daily hours and submit timesheets for approval.',
    features: ['Daily time logs', 'Project-wise hours', 'Weekly submission', 'Manager approval'],
  },
  tasks: {
    title: 'Tasks',
    icon: 'fa-list-check',
    description: 'Stay on top of your assigned tasks and deadlines.',
    features: ['Task board', 'Due date reminders', 'Priority labels', 'Status tracking'],
  },
  projects: {
    title: 'Projects',
    icon: 'fa-diagram-project',
    description: 'View projects you are part of and track progress.',
    features: ['Project overview', 'Milestones', 'Team members', 'Deliverables'],
  },
  goals: {
    title: 'Goals',
    icon: 'fa-bullseye',
    description: 'Set and track your OKRs and personal development goals.',
    features: ['Quarterly OKRs', 'Progress tracking', 'Manager check-ins', 'Self reviews'],
  },
  performance: {
    title: 'Performance',
    icon: 'fa-chart-line',
    description: 'Review your performance ratings, feedback, and growth plan.',
    features: ['Review cycles', '360° feedback', 'Rating history', 'Development plans'],
  },
};

function renderWorkPage(key) {
  const page = WORK_PAGES[key];
  if (!page) return null;

  return asyncHandler(async (req, res) => {
    res.render('employee/work/coming-soon', {
      title: page.title,
      layout: 'employee-main',
      active: `work_${key}`,
      employee: req.employee,
      page,
      pageKey: `work_${key}`,
    });
  });
}

export const renderTimesheets = renderWorkPage('timesheets');
export const renderTasks = renderWorkPage('tasks');
export const renderProjects = renderWorkPage('projects');
export const renderGoals = renderWorkPage('goals');
export const renderPerformance = renderWorkPage('performance');
