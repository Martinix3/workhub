# Mobile Task Edit Functionality - Usage Guide

## Overview

The mobile task edit functionality is fully implemented and automatically enabled for all task elements in the WorkHub application. Users can tap/click on any task to open the edit drawer.

## How It Works

1. **Automatic Integration**: The `taskEditor` module in `workhub.bundle.js` automatically initializes on page load
2. **Event Delegation**: Click events on task elements are automatically captured
3. **Drawer Opening**: When a task is clicked, the `MobileTaskDrawer` opens in edit mode
4. **Data Extraction**: Task data is extracted from DOM data attributes
5. **API Integration**: Updates are saved via Leantime API
6. **UI Refresh**: The task element is updated after saving

## Required HTML Structure

To enable edit functionality on a task element, use the following structure:

```html
<div class="wh-swipeable-task"
     data-task-id="123"
     data-task-status="DOING"
     data-task-priority="P1"
     data-task-department="SALES"
     data-task-due-date="2026-01-15"
     data-task-assigned="user@example.com">
  <div class="wh-swipeable-task-content">
    <div class="task-name">Task name here</div>
    <div class="task-description">Task description here</div>
  </div>
</div>
```

## Data Attributes

### Required
- **data-task-id**: Leantime task ID (required for edit functionality)

### Optional
- **data-task-status**: BACKLOG | NEXT | DOING | BLOCKED | DONE
- **data-task-priority**: P0 | P1 | P2
- **data-task-department**: SALES | OPS | MKT
- **data-task-due-date**: YYYY-MM-DD format
- **data-task-assigned**: User email or name

## Automatic Features

### Click Detection
- Automatically detects clicks on elements with `[data-task-id]`
- Skips action buttons (`.task-action`, `.task-complete-btn`, `.task-delete-btn`)
- Skips during swipe gestures (when `.swiping` class is present)

### Dynamic Task Lists
- Uses DOM MutationObserver to detect new tasks
- Works with dynamically loaded/rendered task lists
- No manual initialization needed

### UI Updates
- Updates task element in DOM after save
- Updates data attributes with new values
- Triggers `task:updated` event for other components
- Falls back to `task:list:refresh` event if element not found

## Programmatic Usage

### Open New Task Drawer
```javascript
frappe.workhub.MobileTaskDrawer.openNewTaskDrawer({
  onSave: (task) => {
    console.log('Task created:', task);
  },
  onCancel: () => {
    console.log('Cancelled');
  }
});
```

### Open Edit Drawer
```javascript
frappe.workhub.MobileTaskDrawer.openEditTaskDrawer({
  id: '123',
  name: 'Task name',
  description: 'Description',
  status: 'DOING',
  priority: 'P1',
  department: 'SALES',
  dueDate: '2026-01-15',
  assignedTo: 'user@example.com'
}, {
  onSave: (task) => {
    console.log('Task updated:', task);
  }
});
```

## Events

### Emitted Events
- **task:created** - Fired when new task is created
- **task:updated** - Fired when task is updated
- **task:list:refresh** - Fired when full list refresh is needed

### Listening to Events
```javascript
frappe.ui.on('task:updated', (updatedTask) => {
  console.log('Task updated:', updatedTask);
  // Refresh your UI
});
```

## Mobile UX Features

### Bottom Sheet Drawer
- Slides up from bottom on mobile
- Converts to centered modal on tablet/desktop
- Swipe down gesture to dismiss
- Touch-optimized form controls

### Form Features
- Large touch targets (48px minimum)
- Visual status picker (segmented control)
- Priority picker with color coding
- Native date picker
- Inline validation
- Loading states during save
- Error messages with retry

### Accessibility
- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Escape key to close
- High contrast mode support
- Reduced motion support

## API Integration

### Create Task
- Method: `workhub_frappe_app.leantime.api.create_task`
- Args: `{ task_data: {...} }`

### Update Task
- Method: `workhub_frappe_app.leantime.api.update_task`
- Args: `{ task_id: '123', task_data: {...} }`

## Styling

The drawer uses the following CSS components:
- `mobile-drawer.css` - Drawer/bottom sheet styles
- `mobile-forms.css` - Touch-optimized form styles
- `swipeable-task.css` - Task item styles (for swipe gestures)

All styles follow the neobrutalismo editorial design system with:
- Sharp borders
- 44px+ touch targets
- GPU-accelerated animations
- Safe area insets for notched devices
- Dark mode support

## Browser Support

- Modern mobile browsers (iOS Safari, Chrome Android)
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Progressive enhancement for older browsers
- Touch and mouse input support

## Initialization

The task editor is automatically initialized on page load via `workhub.bundle.js`:

```javascript
frappe.ready(() => {
  frappe.workhub.taskEditor.init();
});
```

No additional setup required!
