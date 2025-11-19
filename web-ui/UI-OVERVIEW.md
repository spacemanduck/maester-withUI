# Maester Web UI - User Interface Overview

This document provides a visual overview of the Maester Web UI components and features.

## Main Navigation

The application features a clean, modern navigation bar with the Maester branding:

```
┌────────────────────────────────────────────────────────────────┐
│  🔥 Maester     Dashboard     Reports                          │
└────────────────────────────────────────────────────────────────┘
```

- **Dashboard**: Main landing page with quick actions
- **Reports**: Browse report history

## Dashboard Page

The dashboard is the main interface for running tests and accessing reports.

### Header Section
```
┌────────────────────────────────────────────────────────────────┐
│  Maester Security Testing Dashboard                            │
│  Run security tests on your Microsoft 365 environment and      │
│  view results                                                   │
└────────────────────────────────────────────────────────────────┘
```

### Quick Actions (3 Cards)

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  ▶️ Run New Test│  │ 📄 Latest Report│  │ 🕐 Report History│
│                 │  │                 │  │                  │
│  Execute Maester│  │  View report    │  │  Browse all past │
│  security tests │  │  from Jan 1     │  │  reports         │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

- **Run New Test**: Orange card with play icon - click to run tests
- **Latest Report**: Blue card - click to view most recent report
- **Report History**: Green card - click to browse all reports

### Run Maester Tests Section

```
┌────────────────────────────────────────────────────────────────┐
│  Run Maester Tests                                             │
│                                                                 │
│  ☑ Include long-running tests                                 │
│  ☐ Include preview tests                                      │
│                                                                 │
│  [ ▶️ Run Tests ]                                              │
└────────────────────────────────────────────────────────────────┘
```

**Features:**
- Checkboxes for test options
- Run Tests button (disabled during execution)
- Real-time status updates

### Test Execution Status

When tests are running, a status panel appears:

```
┌────────────────────────────────────────────────────────────────┐
│  🕐 Test Status: running                                       │
│                                                                 │
│  Job ID: 123e4567-e89b-12d3-a456-426614174000                │
│  Started: Nov 19, 2024, 3:33:00 PM                           │
└────────────────────────────────────────────────────────────────┘
```

### Completion Status

On successful completion:

```
┌────────────────────────────────────────────────────────────────┐
│  ✅ Test completed successfully!                               │
│                                                                 │
│  Report has been saved to storage.                            │
│  [View Report]                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Error Display

If an error occurs:

```
┌────────────────────────────────────────────────────────────────┐
│  ❌ Error                                                       │
│                                                                 │
│  Failed to connect to PowerShell: module not found            │
└────────────────────────────────────────────────────────────────┘
```

## Reports Page

Browse all historical test reports with metadata.

### Header
```
┌────────────────────────────────────────────────────────────────┐
│  Report History                                                 │
│  Browse and view all your Maester security test reports        │
└────────────────────────────────────────────────────────────────┘
```

### Report List

```
┌────────────────────────────────────────────────────────────────┐
│  📄 maester-report-2024-11-19T15-00-00.html        250 KB      │
│     maester-report-2024-11-19T15-00-00                         │
│     2 hours ago                                                 │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│  📄 maester-report-2024-11-18T12-00-00.html        245 KB      │
│     maester-report-2024-11-18T12-00-00                         │
│     1 day ago                                                   │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│  📄 maester-report-2024-11-17T09-00-00.html        248 KB      │
│     maester-report-2024-11-17T09-00-00                         │
│     2 days ago                                                  │
└────────────────────────────────────────────────────────────────┘
```

**Features:**
- Click any report to view it
- Sorted by date (newest first)
- Shows file size and relative time
- Displays metadata tags if available
- Hover effect on each row

### Empty State

When no reports exist:

```
┌────────────────────────────────────────────────────────────────┐
│                          📄                                     │
│                     No reports                                  │
│              Run your first test to generate a report.         │
│                                                                 │
│                  [ Go to Dashboard ]                           │
└────────────────────────────────────────────────────────────────┘
```

### Loading State

While loading:

```
┌────────────────────────────────────────────────────────────────┐
│                          ⏳                                     │
│                   Loading reports...                           │
└────────────────────────────────────────────────────────────────┘
```

## Report Viewer Page

View individual reports in a secure sandboxed iframe.

### Header with Navigation
```
┌────────────────────────────────────────────────────────────────┐
│  ← Back to Reports                                             │
└────────────────────────────────────────────────────────────────┘
```

### Report Display

```
┌────────────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────────────┐ │
│ │                                                            │ │
│ │              [Embedded Maester HTML Report]                │ │
│ │                                                            │ │
│ │  - Test Results                                            │ │
│ │  - Summary Statistics                                      │ │
│ │  - Detailed Findings                                       │ │
│ │  - Interactive Charts                                      │ │
│ │  - Remediation Guidance                                    │ │
│ │                                                            │ │
│ │  (Full interactive report from Maester)                    │ │
│ │                                                            │ │
│ └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

**Features:**
- Full-screen report viewer
- Sandboxed iframe for security
- Retains all original report functionality
- Interactive elements work normally
- Back navigation to report list

## Color Scheme

The UI uses a clean, professional color palette:

- **Primary**: Orange (#EA580C) - Maester brand color
- **Secondary**: Blue (#2563EB) - Information
- **Success**: Green (#16A34A) - Completed actions
- **Warning**: Yellow (#CA8A04) - Warnings
- **Error**: Red (#DC2626) - Errors
- **Neutral**: Gray (#6B7280) - Text and borders
- **Background**: Light Gray (#F3F4F6) - Page background

## Responsive Design

The UI is fully responsive and works on:

- **Desktop**: Full layout with all features
- **Tablet**: Adapted layout with touch-friendly controls
- **Mobile**: Stacked layout optimized for small screens

### Mobile View Example

```
┌───────────────────┐
│  🔥 Maester       │
│  ☰               │
├───────────────────┤
│  Dashboard        │
├───────────────────┤
│  ▶️ Run New Test │
│                   │
│  Execute Maester  │
│  security tests   │
├───────────────────┤
│  📄 Latest Report │
│                   │
│  View report from │
│  Jan 1            │
├───────────────────┤
│  🕐 Report History│
│                   │
│  Browse all past  │
│  reports          │
└───────────────────┘
```

## Icons Used

The UI uses Heroicons for consistent, professional icons:

- **▶️ PlayIcon**: Run tests, execution
- **📄 DocumentTextIcon**: Reports, files
- **🕐 ClockIcon**: History, timing, status
- **🏠 HomeIcon**: Dashboard, home
- **← ArrowLeftIcon**: Back navigation
- **✅ CheckCircleIcon**: Success states
- **❌ XCircleIcon**: Error states
- **⏳ Loading**: Spinner animation

## User Experience Features

### 1. Real-time Updates
- Test status polls every 3 seconds
- Progress indicators during execution
- Smooth transitions between states

### 2. Error Handling
- Clear error messages
- Specific error descriptions
- Helpful troubleshooting hints

### 3. Loading States
- Skeleton loaders where appropriate
- Spinner animations for async operations
- Disabled buttons during processing

### 4. Accessibility
- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- High contrast text

### 5. Visual Feedback
- Hover effects on interactive elements
- Active states for buttons
- Color-coded status indicators
- Toast notifications (can be added)

## Interaction Flows

### Running a Test

1. User arrives at Dashboard
2. Optionally checks test options
3. Clicks "Run Tests"
4. Button becomes disabled, shows "Running Tests..."
5. Status panel appears showing job ID and start time
6. Status updates automatically every 3 seconds
7. On completion, success message appears with "View Report" link
8. Clicking view link navigates to report viewer

### Viewing Report History

1. User clicks "Reports" in navigation
2. Loading spinner appears briefly
3. List of reports appears, sorted by date
4. User clicks a report
5. Report viewer page loads
6. Full HTML report displays in iframe
7. User can click "Back to Reports" to return

### Quick Access to Latest

1. User clicks "Latest Report" card on Dashboard
2. Immediately navigates to latest report viewer
3. Report displays without going through history page

## Browser Compatibility

The UI is tested and works on:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **Initial Load**: < 2 seconds
- **Report List**: < 1 second
- **Report Viewer**: < 2 seconds (depends on report size)
- **Test Execution**: Depends on Maester test duration (typically 2-10 minutes)

## Accessibility Standards

The UI aims to meet WCAG 2.1 Level AA standards:

- Color contrast ratios meet requirements
- All interactive elements keyboard accessible
- Focus indicators visible
- Screen reader friendly
- Alt text for images/icons

## Summary

The Maester Web UI provides a clean, modern, and user-friendly interface for running security tests and managing reports. The design prioritizes:

- **Simplicity**: Easy to understand and use
- **Security**: Multiple layers of protection
- **Performance**: Fast load times and smooth interactions
- **Accessibility**: Usable by everyone
- **Professionalism**: Clean, branded appearance

All screens are designed to be intuitive, with clear calls to action and helpful feedback throughout the user journey.
